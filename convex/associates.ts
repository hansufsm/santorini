/**
 * associates.ts — Cadastro de Associados (titulares financeiros)
 *
 * A tabela "associates" guarda o histórico financeiro e cadastral dos
 * titulares da unidade. Um Associado pode ter vários Moradores vinculados.
 *
 * Política de exclusão: registros nunca são deletados permanentemente.
 * Use updateAssociate com status="inativo" ou o campo deletedAt para
 * remover da visão sem perder o histórico.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./auth";

// ─── Mutations ────────────────────────────────────────────────────────────────

export const createAssociate = mutation({
  args: {
    sessionToken: v.string(),
    name: v.string(),
    unit: v.string(),
    cpf: v.optional(v.string()),
    cpfPrefix: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    status: v.union(
      v.literal("ativo"),
      v.literal("inativo"),
      v.literal("inadimplente")
    ),
    joinedAt: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, ...args }) => {
    // Apenas diretoria ou sysadmin podem cadastrar associados
    await requireRole(ctx.db, sessionToken, "diretoria");

    const now = Date.now();
    return await ctx.db.insert("associates", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateAssociate = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("associates"),
    name: v.optional(v.string()),
    unit: v.optional(v.string()),
    cpf: v.optional(v.string()),
    cpfPrefix: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("ativo"),
        v.literal("inativo"),
        v.literal("inadimplente")
      )
    ),
    joinedAt: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, id, ...fields }) => {
    // Apenas diretoria ou sysadmin podem editar o cadastro completo
    await requireRole(ctx.db, sessionToken, "diretoria");
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

export const updateAssociateStatus = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("associates"),
    status: v.union(
      v.literal("ativo"),
      v.literal("inativo"),
      v.literal("inadimplente")
    ),
  },
  handler: async (ctx, { sessionToken, id, status }) => {
    // Apenas diretoria ou sysadmin podem alterar o status
    await requireRole(ctx.db, sessionToken, "diretoria");
    await ctx.db.patch(id, { status, updatedAt: Date.now() });
  },
});

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getAllAssociates = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("associates").collect();

    // Excluir registros inativados (soft delete)
    const visible = all.filter((a) => a.deletedAt === undefined);

    return visible.sort((a, b) => a.unit.localeCompare(b.unit));
  },
});

export const getAssociatesByStatus = query({
  args: {
    status: v.union(
      v.literal("ativo"),
      v.literal("inativo"),
      v.literal("inadimplente")
    ),
  },
  handler: async (ctx, { status }) => {
    const all = await ctx.db
      .query("associates")
      .withIndex("by_status", (q) => q.eq("status", status))
      .collect();

    // Excluir inativados mesmo com o status correto
    return all.filter((a) => a.deletedAt === undefined);
  },
});

export const searchAssociate = query({
  args: { search: v.string() },
  handler: async (ctx, { search }) => {
    const term = search.toLowerCase().trim();
    const all = await ctx.db.query("associates").collect();

    return all.filter(
      (a) =>
        a.deletedAt === undefined && // ignorar inativados
        (a.name.toLowerCase().includes(term) ||
          (a.cpfPrefix && a.cpfPrefix.startsWith(term)) ||
          a.unit.includes(term))
    );
  },
});

export const getAssociatesSummary = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("associates").collect();

    // Contabilizar apenas os não inativados via soft delete
    const active = all.filter((a) => a.deletedAt === undefined);

    return {
      total: active.length,
      ativos: active.filter((a) => a.status === "ativo").length,
      inativos: active.filter((a) => a.status === "inativo").length,
      inadimplentes: active.filter((a) => a.status === "inadimplente").length,
    };
  },
});

// ─── PORTAL DO ASSOCIADO ──────────────────────────────────────────────────────
//
// authenticateAssociate: mantido para compatibilidade com o frontend atual.
// No Next.js (Fase 2), será substituído por auth:loginWithCpf.

/**
 * Autentica pelo CPF completo (11 dígitos).
 * Retorna apenas campos seguros — nunca expõe CPF real, notes ou senhas.
 */
export const authenticateAssociate = query({
  args: { cpf: v.string() },
  handler: async (ctx, { cpf }) => {
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned.length !== 11) return null;

    const all = await ctx.db.query("associates").collect();

    // Encontrar o associado com este CPF (ignorar inativados)
    const match = all.find(
      (a) =>
        a.cpf &&
        a.cpf.replace(/\D/g, "") === cleaned &&
        a.deletedAt === undefined
    );

    if (!match) return null;

    // Retornar apenas campos seguros para a sessão do cliente
    return {
      _id: match._id,
      name: match.name,
      unit: match.unit ?? "",
      email: match.email ?? "",
      phone: match.phone ?? "",
      status: match.status,
      joinedAt: match.joinedAt ?? "",
      cpfPrefix: match.cpfPrefix ?? cleaned.slice(0, 5),
    };
  },
});

/**
 * Autoatendimento: o próprio associado atualiza seu e-mail e telefone.
 * Usa o _id da sessão (não precisa refornecer CPF).
 */
export const updateAssociateContact = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("associates"),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, id, email, phone }) => {
    // Morador pode editar apenas seus próprios dados de contato
    const caller = await requireRole(ctx.db, sessionToken, "morador");

    // Verificar que o usuário está editando seus próprios dados
    if (caller.associateId?.toString() !== id) {
      throw new Error("Você só pode editar seus próprios dados de contato.");
    }

    const record = await ctx.db.get(id);
    if (!record) throw new Error("Associado não encontrado");

    // Construir objeto de atualização apenas com os campos fornecidos
    const update: Record<string, unknown> = { updatedAt: Date.now() };
    if (email !== undefined) update.email = email;
    if (phone !== undefined) update.phone = phone;

    await ctx.db.patch(id, update);
    return { success: true };
  },
});
