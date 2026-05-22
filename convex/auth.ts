/**
 * auth.ts — Autenticação e sessões do sistema Santorini
 *
 * Dois tipos de login:
 *   1. CPF (11 dígitos) — para Associados e Moradores
 *   2. Email + senha     — para Diretoria e Sysadmin
 *
 * Cada login gera um token aleatório que fica salvo na tabela "sessions".
 * O cliente guarda esse token no sessionStorage e o envia em cada chamada
 * que exige autenticação.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Tempo de vida da sessão: 8 horas em milissegundos
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

// Hierarquia de papéis (índice maior = mais permissões)
const ROLE_HIERARCHY = ["morador", "associado", "diretoria", "sysadmin"] as const;
type Role = (typeof ROLE_HIERARCHY)[number];

// ─── Helper interno: gerar token seguro ──────────────────────────────────────

function generateToken(): string {
  // Gera 32 bytes aleatórios e converte para hexadecimal (64 caracteres)
  const arr = new Uint8Array(32);
  globalThis.crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Helper exportado: verificar papel mínimo ────────────────────────────────
//
// Usado por outros módulos (users.ts, etc.) para proteger mutations.
// Recebe ctx.db, o token da sessão e o papel mínimo exigido.
// Lança erro se a sessão for inválida ou o papel insuficiente.

export async function requireRole(
  db: any,
  sessionToken: string,
  minRole: Role
) {
  // Buscar sessão pelo token
  const session = await db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", sessionToken))
    .first();

  if (!session || session.expiresAt < Date.now()) {
    throw new Error("Sessão expirada ou inválida. Faça login novamente.");
  }

  // Buscar o usuário da sessão
  const user = await db.get(session.userId);

  if (!user || user.status !== "ativo" || user.deletedAt !== undefined) {
    throw new Error("Usuário inativo ou não encontrado.");
  }

  // Verificar se o papel do usuário é suficiente
  const userRank = ROLE_HIERARCHY.indexOf(user.role as Role);
  const minRank = ROLE_HIERARCHY.indexOf(minRole);

  if (userRank < minRank) {
    throw new Error(
      `Permissão insuficiente. Papel atual: ${user.role}. Necessário: ${minRole}.`
    );
  }

  // Retorna o usuário para que o chamador possa usar seus dados (ex: _id, role)
  return user;
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
      (u: any) => u.status === "ativo" && u.deletedAt === undefined
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

    // Verificações de segurança — mensagem genérica para não revelar se o email existe
    if (!user || user.deletedAt !== undefined) {
      return { success: false as const, error: "Credenciais inválidas." };
    }
    if (user.status !== "ativo") {
      return { success: false as const, error: "Usuário inativo. Contate o administrador." };
    }
    if (!user.passwordHash || user.passwordHash !== passwordHash) {
      return { success: false as const, error: "Credenciais inválidas." };
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

    return {
      success: true as const,
      token,
      user: {
        _id: user._id as string,
        name: user.name,
        email: user.email ?? "",
        unit: user.unit ?? "",
        role: user.role as Role,
        status: user.status,
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
    if (!user || user.status !== "ativo" || user.deletedAt !== undefined) {
      return null;
    }

    // Se o usuário tem um associado vinculado, buscar dados complementares
    let associateData: any = null;
    if (user.associateId) {
      associateData = await ctx.db.get(user.associateId);
    }

    // Retornar apenas campos seguros (sem CPF completo, sem passwordHash)
    return {
      _id: user._id as string,
      name: user.name,
      email: user.email ?? associateData?.email ?? "",
      phone: associateData?.phone ?? "",
      unit: user.unit ?? associateData?.unit ?? "",
      role: user.role as Role,
      status: user.status,
      associateId: (user.associateId as string) ?? undefined,
      joinedAt: associateData?.joinedAt ?? "",
      cpfPrefix: associateData?.cpfPrefix ?? "",
    };
  },
});

// ─── Seed do primeiro Sysadmin ────────────────────────────────────────────────
//
// Use esta função UMA VEZ via painel Convex (https://dashboard.convex.dev)
// para criar o primeiro sysadmin antes de desabilitar as credenciais hardcoded.
//
// Parâmetros:
//   name        — nome do sysadmin
//   email       — email de login
//   passwordHash — SHA-256 hex da senha desejada
//   guardKey    — deve ser exatamente "SANTORINI_SEED_2026" (evita uso acidental)
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
      (u: any) => u.status === "ativo" && u.deletedAt === undefined
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
