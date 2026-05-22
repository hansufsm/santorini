import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── IMPORTAR LOTE DE ASSOCIADOS (CSV) ────────────────────────────────────────
// Upsert por CPF: se já existe atualiza, senão insere.
// Status é derivado: se leftAt preenchido → "inativo", senão → "ativo".
export const importAssociates = mutation({
  args: {
    associates: v.array(v.object({
      name: v.string(),
      unit: v.optional(v.string()),        // aceita (mas não obriga) unidade do CSV
      cpf: v.optional(v.string()),
      cpfPrefix: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      joinedAt: v.optional(v.string()),
      leftAt: v.optional(v.string()),
      notes: v.optional(v.string()),
      status: v.union(v.literal("ativo"), v.literal("inativo"), v.literal("inadimplente")),
    })),
  },
  handler: async (ctx, { associates }) => {
    let inserted = 0, updated = 0;
    const now = Date.now();

    // Carrega todos os associados uma única vez e monta índices em memória
    const existing = await ctx.db.query("associates").collect();
    const byCpf  = new Map(existing.filter(r => r.cpf).map(r => [r.cpf!, r]));
    const byName = new Map(existing.map(r => [r.name.toLowerCase(), r]));

    for (const a of associates) {
      const found = (a.cpf ? byCpf.get(a.cpf) : null) ?? byName.get(a.name.toLowerCase()) ?? null;
      if (found) {
        await ctx.db.patch(found._id, { ...a, updatedAt: now });
        updated++;
      } else {
        await ctx.db.insert("associates", { ...a, createdAt: now, updatedAt: now });
        inserted++;
      }
    }
    return { inserted, updated, total: associates.length };
  },
});

// ─── LIMPAR TODOS OS ASSOCIADOS ───────────────────────────────────────────────
// Apaga todo o cadastro — usar antes de reimportar CSV com dados corrigidos.
export const clearAllAssociates = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("associates").collect();
    await Promise.all(all.map((a) => ctx.db.delete(a._id)));
    return { deleted: all.length };
  },
});

export const createAssociate = mutation({
  args: {
    name: v.string(),
    unit: v.string(),
    cpf: v.optional(v.string()),
    cpfPrefix: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    status: v.union(v.literal("ativo"), v.literal("inativo"), v.literal("inadimplente")),
    joinedAt: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("associates", { ...args, createdAt: now, updatedAt: now });
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
    status: v.optional(v.union(v.literal("ativo"), v.literal("inativo"), v.literal("inadimplente"))),
    joinedAt: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

export const updateAssociateStatus = mutation({
  args: {
    id: v.id("associates"),
    status: v.union(v.literal("ativo"), v.literal("inativo"), v.literal("inadimplente")),
  },
  handler: async (ctx, { id, status }) => {
    await ctx.db.patch(id, { status, updatedAt: Date.now() });
  },
});

export const getAllAssociates = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("associates").collect();
    return all.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  },
});

export const getAssociatesByStatus = query({
  args: {
    status: v.union(v.literal("ativo"), v.literal("inativo"), v.literal("inadimplente")),
  },
  handler: async (ctx, { status }) => {
    return await ctx.db.query("associates").withIndex("by_status", (q) => q.eq("status", status)).collect();
  },
});

export const searchAssociate = query({
  args: { search: v.string() },
  handler: async (ctx, { search }) => {
    const term = search.toLowerCase().trim();
    const all = await ctx.db.query("associates").collect();
    return all.filter((a) =>
      a.name.toLowerCase().includes(term) ||
      (a.cpfPrefix && a.cpfPrefix.startsWith(term)) ||
      (a.unit && a.unit.includes(term))
    );
  },
});

export const getAssociatesSummary = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("associates").collect();
    return {
      total: all.length,
      ativos: all.filter((a) => a.status === "ativo").length,
      inativos: all.filter((a) => a.status === "inativo").length,
      inadimplentes: all.filter((a) => a.status === "inadimplente").length,
    };
  },
});
