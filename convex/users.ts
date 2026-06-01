/**
 * users.ts — Gerenciamento de usuários do sistema Santorini
 *
 * Todas as mutations aqui exigem um sessionToken válido (gerado pelo login).
 * O papel do usuário autenticado determina o que ele pode fazer.
 *
 * Regras principais:
 *   - Diretoria pode criar/inativar Associados e Moradores
 *   - Apenas Sysadmin pode criar/inativar Diretoria ou outro Sysadmin
 *   - Máximo de 2 Sysadmins ativos ao mesmo tempo
 *   - Dados nunca são excluídos — apenas inativados (deletedAt preenchido)
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getEffectiveUserStatus, isUserActive, requireRole } from "./_lib";

const normalizeUnit = (unit?: string) => {
  const cleaned = unit?.trim().replace(/\s+/g, " ").toUpperCase();
  return cleaned || undefined;
};

const getActiveAssociateOrThrow = async (ctx: any, associateId: any) => {
  const associate = await ctx.db.get(associateId);
  if (!associate || associate.deletedAt !== undefined) {
    throw new Error("Associado financeiro/titular não encontrado.");
  }
  return associate;
};

const sha256Hex = async (text: string) => {
  const data = new TextEncoder().encode(text);
  const hash = await globalThis.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const passwordHashFromAssociateCpf = async (ctx: any, associateId: any) => {
  const associate = await getActiveAssociateOrThrow(ctx, associateId);
  const cpfDigits = associate.cpf?.replace(/\D/g, "") ?? "";
  if (cpfDigits.length !== 11) {
    throw new Error("O cadastro financeiro vinculado precisa ter CPF completo para gerar a senha inicial.");
  }
  return sha256Hex(cpfDigits);
};

const buildResidencePatch = async (
  ctx: any,
  fields: {
    role: "sysadmin" | "diretoria" | "associado" | "morador";
    unit?: string;
    associateId?: any;
    parentAssociateId?: any;
  }
) => {
  const patch: Record<string, unknown> = {
    unit: normalizeUnit(fields.unit),
  };

  if (fields.role === "associado") {
    if (!fields.associateId) {
      throw new Error("Selecione o cadastro financeiro vinculado para usuários Associados.");
    }

    patch.parentAssociateId = undefined;
    patch.associateId = fields.associateId;

    const associate = await getActiveAssociateOrThrow(ctx, fields.associateId);
    patch.unit = normalizeUnit(associate.unit) ?? patch.unit;
  } else if (fields.role === "morador") {
    if (!fields.parentAssociateId) {
      throw new Error("Selecione o titular financeiro da unidade para usuários Moradores.");
    }

    patch.associateId = undefined;
    patch.parentAssociateId = fields.parentAssociateId;

    const parentAssociate = await getActiveAssociateOrThrow(ctx, fields.parentAssociateId);
    patch.unit = normalizeUnit(parentAssociate.unit) ?? patch.unit;
  } else {
    // Perfis administrativos podem ter unidade informativa, mas não devem assumir
    // automaticamente um vínculo financeiro/titular de associado.
    patch.associateId = undefined;
    patch.parentAssociateId = undefined;
  }

  return patch;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Lista todos os usuários ativos.
 * Diretoria não vê Sysadmins; Sysadmin vê todos.
 */
export const getAllUsers = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    // Verificar autenticação — mínimo: Diretoria
    const caller = await requireRole(ctx.db, sessionToken, "diretoria");

    // Buscar todos os usuários não inativados
    const all = await ctx.db
      .query("users")
      .filter((q: any) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Diretoria não pode ver Sysadmins (privacidade e segurança)
    const visible =
      caller.role === "sysadmin"
        ? all
        : all.filter((u: any) => u.role !== "sysadmin");

    // Retornar apenas campos necessários (sem passwordHash!)
    return visible.map((u: any) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: getEffectiveUserStatus(u),
      unit: u.unit,
      associateId: u.associateId,
      parentAssociateId: u.parentAssociateId,
      createdAt: u.createdAt,
    }));
  },
});

/**
 * Retorna quantos Sysadmins ativos existem.
 * Usado no frontend para mostrar aviso quando o limite (2) está próximo.
 * Esta query é pública (não exige sessão) pois não revela dados pessoais.
 */
export const getSysadminCount = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db
      .query("users")
      .withIndex("by_role", (q: any) => q.eq("role", "sysadmin"))
      .collect();

    // Contar apenas os ativos e não inativados
    return all.filter(
      (u: any) => isUserActive(u)
    ).length;
  },
});

/**
 * Dados exclusivos para o painel de Gestão da Diretoria.
 * Apenas Sysadmin pode consultar quem já pertence à diretoria e quais associados
 * ativos podem receber esse papel administrativo sensível.
 */
export const getDirectoriaManagementData = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const caller = await requireRole(ctx.db, sessionToken, "sysadmin");
    if (caller.role !== "sysadmin") {
      throw new Error("Apenas Sysadmin pode acessar a gestão da Diretoria.");
    }

    const users = await ctx.db
      .query("users")
      .filter((q: any) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const serialize = (u: any) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: getEffectiveUserStatus(u),
      unit: u.unit,
      associateId: u.associateId,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    });

    return {
      members: users
        .filter((u: any) => u.role === "diretoria" && isUserActive(u))
        .map(serialize),
      candidates: users
        .filter((u: any) => u.role === "associado" && isUserActive(u))
        .map(serialize),
    };
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Cria um novo usuário no sistema.
 *
 * Regras de quem pode criar quem:
 *   - Diretoria → pode criar Associado e Morador
 *   - Sysadmin  → pode criar qualquer papel (incluindo Diretoria e Sysadmin)
 */
export const createUser = mutation({
  args: {
    sessionToken: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    passwordHash: v.optional(v.string()), // SHA-256 hex — obrigatório para Diretoria/Sysadmin
    role: v.union(
      v.literal("sysadmin"),
      v.literal("diretoria"),
      v.literal("associado"),
      v.literal("morador")
    ),
    unit: v.optional(v.string()),
    // Para Associado: ID do registro na tabela associates (dados financeiros)
    associateId: v.optional(v.id("associates")),
    // Para Morador: ID do Associado titular da mesma unidade
    parentAssociateId: v.optional(v.id("associates")),
  },
  handler: async (ctx, { sessionToken, ...fields }) => {
    // Verificar autenticação — mínimo: Diretoria
    const caller = await requireRole(ctx.db, sessionToken, "diretoria");

    // Diretoria NÃO pode criar Sysadmin nem outro Diretoria
    if (fields.role === "sysadmin" || fields.role === "diretoria") {
      if (caller.role !== "sysadmin") {
        throw new Error(
          "Apenas Sysadmin pode criar usuários com papel Diretoria ou Sysadmin."
        );
      }
    }

    // Regra de negócio: máximo 2 Sysadmins ativos
    if (fields.role === "sysadmin") {
      const existingSysadmins = await ctx.db
        .query("users")
        .withIndex("by_role", (q: any) => q.eq("role", "sysadmin"))
        .collect();

      const activeCount = existingSysadmins.filter(
        (u: any) => isUserActive(u)
      ).length;

      if (activeCount >= 2) {
        throw new Error(
          "Limite atingido: só podem existir 2 Sysadmins ativos ao mesmo tempo."
        );
      }
    }

    // Verificar se o email já está em uso (se informado)
    if (fields.email) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", fields.email))
        .first();

      if (existing && existing.deletedAt === undefined) {
        throw new Error("Este e-mail já está cadastrado.");
      }
    }

    if ((fields.role === "sysadmin" || fields.role === "diretoria") && !fields.passwordHash) {
      throw new Error("Senha é obrigatória para usuários Sysadmin e Diretoria.");
    }

    const now = Date.now();
    const residencePatch = await buildResidencePatch(ctx, {
      role: fields.role,
      unit: fields.unit,
      associateId: fields.associateId,
      parentAssociateId: fields.parentAssociateId,
    });

    const passwordHash = fields.passwordHash ?? (
      fields.role === "associado"
        ? await passwordHashFromAssociateCpf(ctx, fields.associateId)
        : fields.role === "morador"
          ? await passwordHashFromAssociateCpf(ctx, fields.parentAssociateId)
          : undefined
    );

    const newId = await ctx.db.insert("users", {
      ...fields,
      passwordHash,
      ...residencePatch,
      status: "ativo",
      createdBy: caller._id, // registrar quem criou
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, id: newId };
  },
});

/**
 * Atualiza dados de um usuário. Diretoria pode atualizar dados básicos de perfis operacionais;
 * apenas Sysadmin pode alterar papéis ou editar perfis administrativos sensíveis.
 */
export const updateUser = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
    role: v.optional(v.union(
      v.literal("sysadmin"),
      v.literal("diretoria"),
      v.literal("associado"),
      v.literal("morador")
    )),
    unit: v.optional(v.string()),
    associateId: v.optional(v.id("associates")),
    parentAssociateId: v.optional(v.id("associates")),
  },
  handler: async (ctx, { sessionToken, id, ...fields }) => {
    const caller = await requireRole(ctx.db, sessionToken, "diretoria");

    // Buscar o usuário que será editado
    const target = await ctx.db.get(id);
    if (!target || target.deletedAt !== undefined) {
      throw new Error("Usuário não encontrado.");
    }

    // Proteção: somente Sysadmin pode editar outro Sysadmin
    if (target.role === "sysadmin" && caller.role !== "sysadmin") {
      throw new Error("Apenas Sysadmin pode editar outro Sysadmin.");
    }

    // Proteção: Diretoria não pode editar outro Diretoria
    if (target.role === "diretoria" && caller.role !== "sysadmin") {
      throw new Error("Apenas Sysadmin pode editar usuários com papel Diretoria.");
    }

    // Alteração de papel é uma operação sensível e fica restrita ao Sysadmin.
    if (fields.role !== undefined) {
      if (caller.role !== "sysadmin") {
        throw new Error("Apenas Sysadmin pode alterar o papel de usuários.");
      }

      if (target._id === caller._id && fields.role !== "sysadmin") {
        throw new Error("Sysadmin não pode remover o próprio papel administrativo.");
      }

      if (fields.role === "diretoria" && target.role !== "diretoria" && target.role !== "associado") {
        throw new Error("Apenas usuários com papel Associado podem ser promovidos à Diretoria.");
      }

      if (fields.role === "sysadmin" && target.role !== "sysadmin") {
        const existingSysadmins = await ctx.db
          .query("users")
          .withIndex("by_role", (q: any) => q.eq("role", "sysadmin"))
          .collect();

        const activeCount = existingSysadmins.filter(
          (u: any) => isUserActive(u)
        ).length;

        if (activeCount >= 2) {
          throw new Error("Limite de 2 Sysadmins ativos atingido.");
        }
      }
    }

    const nextRole = fields.role ?? target.role;
    const residencePatch = await buildResidencePatch(ctx, {
      role: nextRole,
      unit: fields.unit ?? target.unit,
      associateId: fields.associateId ?? target.associateId,
      parentAssociateId: fields.parentAssociateId ?? target.parentAssociateId,
    });

    const patch: Record<string, unknown> = {
      updatedAt: Date.now(),
      ...residencePatch,
    };
    for (const [key, value] of Object.entries(fields)) {
      if (
        value !== undefined &&
        key !== "unit" &&
        key !== "associateId" &&
        key !== "parentAssociateId"
      ) {
        patch[key] = value;
      }
    }

    await ctx.db.patch(id, patch);
    return { success: true };
  },
});

/**
 * Promove um Associado ativo para Diretoria.
 * A operação concede acesso administrativo a dados sensíveis, funcionais e financeiros.
 */
export const promoteAssociateToDirectoria = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("users"),
  },
  handler: async (ctx, { sessionToken, id }) => {
    const caller = await requireRole(ctx.db, sessionToken, "sysadmin");
    if (caller.role !== "sysadmin") {
      throw new Error("Apenas Sysadmin pode conceder papel de Diretoria.");
    }

    const target = await ctx.db.get(id);
    if (!target || target.deletedAt !== undefined || !isUserActive(target)) {
      throw new Error("Associado não encontrado ou inativo.");
    }

    if (target.role !== "associado") {
      throw new Error("Apenas usuários com papel Associado podem ser promovidos à Diretoria.");
    }

    await ctx.db.patch(id, {
      role: "diretoria",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Remove o papel Diretoria de um usuário, mantendo-o como Associado ativo.
 * A operação revoga o acesso administrativo a dados sensíveis do sistema.
 */
export const removeDirectoriaRole = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("users"),
  },
  handler: async (ctx, { sessionToken, id }) => {
    const caller = await requireRole(ctx.db, sessionToken, "sysadmin");
    if (caller.role !== "sysadmin") {
      throw new Error("Apenas Sysadmin pode remover papel de Diretoria.");
    }

    const target = await ctx.db.get(id);
    if (!target || target.deletedAt !== undefined || !isUserActive(target)) {
      throw new Error("Membro da Diretoria não encontrado ou inativo.");
    }

    if (target.role !== "diretoria") {
      throw new Error("Este usuário não pertence atualmente à Diretoria.");
    }

    await ctx.db.patch(id, {
      role: "associado",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Inativa um usuário (soft delete).
 * O registro permanece no banco com deletedAt preenchido — nunca é excluído.
 */
export const deactivateUser = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("users"),
  },
  handler: async (ctx, { sessionToken, id }) => {
    const caller = await requireRole(ctx.db, sessionToken, "diretoria");

    const target = await ctx.db.get(id);
    if (!target || target.deletedAt !== undefined) {
      throw new Error("Usuário não encontrado ou já inativado.");
    }

    // Somente Sysadmin pode inativar perfis administrativos sensíveis
    if ((target.role === "sysadmin" || target.role === "diretoria") && caller.role !== "sysadmin") {
      throw new Error("Apenas Sysadmin pode inativar usuários com papel Diretoria ou Sysadmin.");
    }

    if (target.role === "sysadmin") {
      // Garantir que sempre reste pelo menos 1 Sysadmin ativo
      const allSysadmins = await ctx.db
        .query("users")
        .withIndex("by_role", (q: any) => q.eq("role", "sysadmin"))
        .collect();

      const remainingActive = allSysadmins.filter(
        (u: any) =>
          isUserActive(u) &&
          u._id !== id // excluir o que estamos inativando
      ).length;

      if (remainingActive < 1) {
        throw new Error(
          "Não é possível inativar: deve restar pelo menos 1 Sysadmin ativo."
        );
      }
    }

    // Inativar: preencher deletedAt e mudar status para inativo
    await ctx.db.patch(id, {
      status: "inativo",
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Reativa um usuário previamente inativado.
 */
export const reactivateUser = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("users"),
  },
  handler: async (ctx, { sessionToken, id }) => {
    const caller = await requireRole(ctx.db, sessionToken, "diretoria");

    const target = await ctx.db.get(id);
    if (!target) {
      throw new Error("Usuário não encontrado.");
    }

    // Somente Sysadmin pode reativar perfis administrativos sensíveis
    if ((target.role === "sysadmin" || target.role === "diretoria") && caller.role !== "sysadmin") {
      throw new Error("Apenas Sysadmin pode reativar usuários com papel Diretoria ou Sysadmin.");
    }

    // Verificar limite ao reativar Sysadmin
    if (target.role === "sysadmin") {
      const allSysadmins = await ctx.db
        .query("users")
        .withIndex("by_role", (q: any) => q.eq("role", "sysadmin"))
        .collect();

      const activeCount = allSysadmins.filter(
        (u: any) => isUserActive(u)
      ).length;

      if (activeCount >= 2) {
        throw new Error(
          "Limite de 2 Sysadmins ativos atingido. Inative um antes de reativar este."
        );
      }
    }

    // Reativar: limpar deletedAt e mudar status para ativo
    await ctx.db.patch(id, {
      status: "ativo",
      deletedAt: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
