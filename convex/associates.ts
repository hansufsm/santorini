/**
 * associates.ts — Cadastro de Associados (titulares financeiros)
 *
 * Política: registros nunca são deletados permanentemente.
 * clearAllAssociates faz soft delete em lote (para antes de reimportar CSV).
 * importAssociates reativa registros soft-deletados se encontrar pelo CPF/nome.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── IMPORTAR LOTE DE ASSOCIADOS (CSV) ────────────────────────────────────────
// Upsert por CPF: se já existe (mesmo inativado) atualiza, senão insere.
// Status é derivado pelo chamador: se leftAt preenchido → "inativo", senão → "ativo".

export const importAssociates = mutation({
  args: {
    associates: v.array(v.object({
      name: v.string(),
      unit: v.optional(v.string()),
      cpf: v.optional(v.string()),
      cpfPrefix: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      joinedAt: v.optional(v.string()),
      leftAt: v.optional(v.string()),
      notes: v.optional(v.string()),
      status: v.union(
        v.literal("ativo"),
        v.literal("inativo"),
        v.literal("inadimplente")
      ),
    })),
  },
  handler: async (ctx, { associates }) => {
    let inserted = 0, updated = 0;
    const now = Date.now();

    // Carregar todos (incluindo soft-deletados) para o upsert funcionar depois do clearAll
    const existing = await ctx.db.query("associates").collect();
    const byCpf  = new Map(existing.filter(r => r.cpf).map(r => [r.cpf!, r]));
    const byName = new Map(existing.map(r => [r.name.toLowerCase(), r]));

    for (const a of associates) {
      const found = (a.cpf ? byCpf.get(a.cpf) : null) ?? byName.get(a.name.toLowerCase()) ?? null;
      if (found) {
        // Atualizar e reativar se estava soft-deletado
        await ctx.db.patch(found._id, { ...a, deletedAt: undefined, updatedAt: now });
        updated++;
      } else {
        await ctx.db.insert("associates", { ...a, createdAt: now, updatedAt: now });
        inserted++;
      }
    }
    return { inserted, updated, total: associates.length };
  },
});

// ─── LIMPAR TODOS (soft delete em lote) ───────────────────────────────────────
// Inativa todos antes de reimportar CSV com dados corrigidos.
// Os registros continuam no banco — importAssociates os reativa ao reimportar.

export const clearAllAssociates = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("associates").collect();
    const now = Date.now();
    // Soft delete em lote — não excluir permanentemente
    await Promise.all(
      all.map((a) =>
        ctx.db.patch(a._id, { deletedAt: now, status: "inativo", updatedAt: now })
      )
    );
    return { archived: all.length };
  },
});

// ─── CRUD básico ──────────────────────────────────────────────────────────────

export const createAssociate = mutation({
  args: {
    name: v.string(),
    unit: v.optional(v.string()),
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
    leftAt: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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
    leftAt: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

export const updateAssociateStatus = mutation({
  args: {
    id: v.id("associates"),
    status: v.union(
      v.literal("ativo"),
      v.literal("inativo"),
      v.literal("inadimplente")
    ),
  },
  handler: async (ctx, { id, status }) => {
    await ctx.db.patch(id, { status, updatedAt: Date.now() });
  },
});

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getAllAssociates = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("associates").collect();
    // Excluir soft-deletados
    const visible = all.filter((a) => a.deletedAt === undefined);
    return visible.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
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
        a.deletedAt === undefined &&
        (a.name.toLowerCase().includes(term) ||
          (a.cpfPrefix && a.cpfPrefix.startsWith(term)) ||
          (a.unit && a.unit.includes(term)))
    );
  },
});

export const getAssociatesSummary = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("associates").collect();
    const visible = all.filter((a) => a.deletedAt === undefined);
    return {
      total: visible.length,
      ativos: visible.filter((a) => a.status === "ativo").length,
      inativos: visible.filter((a) => a.status === "inativo").length,
      inadimplentes: visible.filter((a) => a.status === "inadimplente").length,
    };
  },
});

// ─── PORTAL DO ASSOCIADO ──────────────────────────────────────────────────────

/**
 * Autentica pelo CPF completo (11 dígitos).
 * Retorna apenas campos seguros — nunca expõe o CPF real, notes ou senhas.
 * Mantido para compatibilidade com o frontend atual (Next.js usará auth:loginWithCpf).
 */
export const authenticateAssociate = query({
  args: { cpf: v.string() },
  handler: async (ctx, { cpf }) => {
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned.length !== 11) return null;

    const all = await ctx.db.query("associates").collect();
    const match = all.find(
      (a) =>
        a.cpf &&
        a.cpf.replace(/\D/g, "") === cleaned &&
        a.deletedAt === undefined
    );

    if (!match) return null;

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
 * Autoatendimento: o associado atualiza apenas e-mail e telefone.
 * Usa o _id da sessão (sem precisar refornecer CPF).
 */
export const updateAssociateContact = mutation({
  args: {
    id: v.id("associates"),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, { id, email, phone }) => {
    const record = await ctx.db.get(id);
    if (!record) throw new Error("Associado não encontrado");

    const update: Record<string, unknown> = { updatedAt: Date.now() };
    if (email !== undefined) update.email = email;
    if (phone !== undefined) update.phone = phone;

    await ctx.db.patch(id, update);
    return { success: true };
  },
});
