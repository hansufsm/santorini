import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getAllSuppliers = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("suppliers").collect();
    return all.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const createSupplier = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    cnpj: v.optional(v.string()),
    contact: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    contractStart: v.optional(v.string()),
    contractEnd: v.optional(v.string()),
    monthlyValue: v.optional(v.number()),
    status: v.union(v.literal("ativo"), v.literal("inativo")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.name) throw new Error("Nome é obrigatório");
    const now = Date.now();
    return await ctx.db.insert("suppliers", { ...args, createdAt: now, updatedAt: now });
  },
});

export const updateSupplier = mutation({
  args: {
    id: v.id("suppliers"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    cnpj: v.optional(v.string()),
    contact: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    contractStart: v.optional(v.string()),
    contractEnd: v.optional(v.string()),
    monthlyValue: v.optional(v.number()),
    status: v.optional(v.union(v.literal("ativo"), v.literal("inativo"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

export const deleteSupplier = mutation({
  args: { id: v.id("suppliers") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
