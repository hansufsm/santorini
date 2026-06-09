/**
 * auth.ts — Autenticação e sessões do sistema Santorini
 *
 * Dois tipos de login:
 *   1. CPF (11 dígitos) — para Associados e Moradores
 *   2. Email + senha     — para Diretoria e Sysadmin
 *
 * Cada login gera um token aleatório que fica salvo na tabela "sessions".
 * O cliente guarda esse token no cookie e o envia em cada chamada que
 * exige autenticação.
 *
 * NOTA: requireRole foi movido para _lib.ts para que auth.ts exporte
 * apenas funções Convex (mutation/query), evitando que o Convex trate
 * este arquivo como módulo helper em vez de módulo de funções.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getEffectiveUserStatus, isUserActive, type Role } from "./_lib";
import { api } from "./_generated/api";

// Tempo de vida da sessão: 8 horas em milissegundos
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

// ─── Helper interno: gerar token seguro ──────────────────────────────────────

function generateToken(): string {
  // Gera 32 bytes aleatórios e converte para hexadecimal (64 caracteres)
  const arr = new Uint8Array(32);
  globalThis.crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Login com CPF (Associados e Moradores) ───────────────────────────────────

export const loginWithCpf = mutation({
  args: {
    cpf: v.string(), // Aceita com ou sem pontuação (ex: "123.456.789-00" ou "12345678900")
  },
  handler: async (ctx, { cpf }) => {
    // Remover pontuação e validar comprimento
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned.length !== 11) {
      return { success: false as const, error: "CPF deve ter 11 dígitos." };
    }

    // Buscar o associado pelo CPF na tabela associates
    const allAssociates = await ctx.db.query("associates").collect();
    const associate = allAssociates.find(
      (a: any) =>
        a.cpf &&
        a.cpf.replace(/\D/g, "") === cleaned &&
        a.deletedAt === undefined // ignorar registros inativados
    );

    if (!associate) {
      return { success: false as const, error: "CPF não encontrado no cadastro." };
    }
    if (associate.status === "inativo") {
      return {
        success: false as const,
        error: "Associado inativo. Contate a administração.",
      };
    }

    // Verificar se já existe um usuário (tabela users) vinculado a este associado
    const linkedUsers = await ctx.db
      .query("users")
      .withIndex("by_associate", (q: any) => q.eq("associateId", associate._id))
      .collect();

    // Filtrar apenas os usuários ativos e não inativados
    const activeUser = linkedUsers.find(
      (u: any) => isUserActive(u)
    );

    let userId: any;
    let role: string;

    if (activeUser) {
      // Usuário já existe no novo sistema
      userId = activeUser._id;
      role = activeUser.role;
    } else {
      // Migração progressiva: o associado ainda não tem conta no novo sistema.
      // Criamos automaticamente uma conta com papel "associado".
      const now = Date.now();
      userId = await ctx.db.insert("users", {
        name: associate.name,
        role: "associado",
        status: "ativo",
        associateId: associate._id,
        unit: associate.unit,
        createdAt: now,
        updatedAt: now,
      });
      role = "associado";
    }

    // Criar token de sessão
    const token = generateToken();
    const now = Date.now();
    await ctx.db.insert("sessions", {
      userId,
      token,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
    });

    const userUnit = associate.unit ? ` (Unidade ${associate.unit})` : "";
    const alertText = `🔑 *Login Efetuado (CPF)*
*Usuário:* ${associate.name}${userUnit}
*Papel:* ${role.toUpperCase()}`;

    await ctx.scheduler.runAfter(0, api.telegram.sendAlertAction, { text: alertText });

    // Retornar token + dados básicos (nunca retornar CPF completo ou passwordHash)
    return {
      success: true as const,
      token,
      user: {
        _id: userId as string,
        name: associate.name,
        unit: associate.unit,
        email: associate.email ?? "",
        phone: associate.phone ?? "",
        status: associate.status,
        joinedAt: associate.joinedAt ?? "",
        cpfPrefix: associate.cpfPrefix ?? cleaned.slice(0, 5),
        role,
        associateId: associate._id as string,
      },
    };
  },
});

// ─── Login com email + senha (Diretoria e Sysadmin) ──────────────────────────
//
// O cliente envia o SHA-256 da senha (nunca a senha em texto puro).
// Exemplo no frontend:
//   const hash = await sha256(senha); // usando Web Crypto API
//   await convexMutation("auth:loginWithPassword", { email, passwordHash: hash });

export const loginWithPassword = mutation({
  args: {
    email: v.string(),
    passwordHash: v.string(), // SHA-256 hex da senha digitada pelo usuário
  },
  handler: async (ctx, { email, passwordHash }) => {
    // Buscar usuário pelo email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .first();

    // Verificações de segurança — mensagem genérica para não revelar se o email existe.
    // Apenas sysadmin pode realizar login por e-mail e senha.
    if (!user || user.deletedAt !== undefined || user.role !== "sysadmin") {
      return { success: false as const, error: "Credenciais inválidas." };
    }
    if (!isUserActive(user)) {
      return { success: false as const, error: "Usuário inativo. Contate o administrador." };
    }
    if (!user.passwordHash || user.passwordHash !== passwordHash) {
      return { success: false as const, error: "Credenciais inválidas." };
    }

    // Migração silenciosa: registros antigos tinham `active: true`, mas não `status`.
    if (!user.status) {
      await ctx.db.patch(user._id, {
        status: getEffectiveUserStatus(user),
        updatedAt: Date.now(),
      });
    }

    let financialAssociateData: any = null;
    const financialAssociateId = user.associateId ?? user.parentAssociateId;
    if (financialAssociateId) {
      financialAssociateData = await ctx.db.get(financialAssociateId);
    }

    // Criar token de sessão
    const token = generateToken();
    const now = Date.now();
    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
    });

    const userUnit = user.unit ? ` (Unidade ${user.unit})` : "";
    const alertText = `🔑 *Login Efetuado (Senha)*
*Usuário:* ${user.name}${userUnit}
*Papel:* ${user.role.toUpperCase()}`;

    await ctx.scheduler.runAfter(0, api.telegram.sendAlertAction, { text: alertText });

    return {
      success: true as const,
      token,
      user: {
        _id: user._id as string,
        name: user.name,
        email: user.email ?? "",
        unit: user.unit ?? "",
        role: user.role as Role,
        status: getEffectiveUserStatus(user),
        associateId: (user.associateId as string) ?? undefined,
        parentAssociateId: (user.parentAssociateId as string) ?? undefined,
        financialResponsibleName: financialAssociateData?.name ?? undefined,
      },
    };
  },
});

// ─── Logout ───────────────────────────────────────────────────────────────────

export const logout = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    // Encontrar e remover a sessão do banco
    // (sessões são os únicos registros que podem ser deletados de verdade)
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q: any) => q.eq("token", sessionToken))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

// ─── Consultar sessão ativa ───────────────────────────────────────────────────
//
// O frontend chama isso ao recarregar a página para restaurar o estado de login.
// Retorna null se a sessão não existir ou estiver expirada.

export const getSession = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    // Buscar sessão pelo token
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q: any) => q.eq("token", sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null; // sessão não existe ou expirou
    }

    // Buscar dados do usuário
    const user = await ctx.db.get(session.userId);
    if (!user || !isUserActive(user)) {
      return null;
    }

    // Se o usuário tem um associado direto ou vínculo indireto à unidade,
    // buscar apenas dados seguros do cadastro financeiro/titular.
    let associateData: any = null;
    const financialAssociateId = user.associateId ?? user.parentAssociateId;
    if (financialAssociateId) {
      associateData = await ctx.db.get(financialAssociateId);
    }

    // Retornar apenas campos seguros (sem CPF completo, sem passwordHash)
    return {
      _id: user._id as string,
      name: user.name,
      email: user.email ?? associateData?.email ?? "",
      phone: associateData?.phone ?? "",
      unit: user.unit ?? associateData?.unit ?? "",
      role: user.role as Role,
      status: getEffectiveUserStatus(user),
      associateId: (user.associateId as string) ?? undefined,
      parentAssociateId: (user.parentAssociateId as string) ?? undefined,
      financialResponsibleName: associateData?.name ?? undefined,
      joinedAt: user.associateId ? associateData?.joinedAt ?? "" : "",
      cpfPrefix: user.associateId ? associateData?.cpfPrefix ?? "" : "",
    };
  },
});

// ─── Seed do primeiro Sysadmin ────────────────────────────────────────────────
//
// Use esta função UMA VEZ via painel Convex (https://dashboard.convex.dev)
// para criar o primeiro sysadmin antes de desabilitar as credenciais hardcoded.
//
// Parâmetros:
//   name         — nome do sysadmin
//   email        — email de login
//   passwordHash — SHA-256 hex da senha desejada
//   guardKey     — deve ser exatamente "SANTORINI_SEED_2026" (evita uso acidental)
//
// Exemplo de como gerar o hash da senha no terminal:
//   echo -n "SuaSenha123" | sha256sum

export const seedFirstSysadmin = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    guardKey: v.string(),
  },
  handler: async (ctx, { name, email, passwordHash, guardKey }) => {
    // Verificação de segurança para evitar uso acidental
    if (guardKey !== "SANTORINI_SEED_2026") {
      throw new Error("guardKey inválida. Acesso negado.");
    }

    // Verificar quantos sysadmins já existem
    const existingSysadmins = await ctx.db
      .query("users")
      .withIndex("by_role", (q: any) => q.eq("role", "sysadmin"))
      .collect();

    const activeSysadmins = existingSysadmins.filter(
      (u: any) => isUserActive(u)
    );

    if (activeSysadmins.length >= 2) {
      throw new Error("Já existem 2 sysadmins ativos. Seed não é necessário.");
    }

    const now = Date.now();
    const id = await ctx.db.insert("users", {
      name,
      email,
      passwordHash,
      role: "sysadmin",
      status: "ativo",
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, id };
  },
});
