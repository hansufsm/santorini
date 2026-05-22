import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
    return all.sort((a, b) => a.unit.localeCompare(b.unit));
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
      a.unit.includes(term)
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

// ─── PORTAL DO ASSOCIADO ──────────────────────────────────────────────────────

// Autentica pelo CPF completo (11 dígitos). Retorna apenas campos seguros —
// nunca expõe o CPF real, notes ou dados administrativos.
export const authenticateAssociate = query({
  args: { cpf: v.string() },
  handler: async (ctx, { cpf }) => {
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned.length !== 11) return null;
    const all = await ctx.db.query("associates").collect();
    const match = all.find(
      (a) => a.cpf && a.cpf.replace(/\D/g, "") === cleaned
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

// Autoatendimento: associado atualiza apenas e-mail e telefone (usa o _id da sessão).
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
