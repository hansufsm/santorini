import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getAllAssets = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("assets").collect();
    return all.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const createAsset = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    description: v.optional(v.string()),
    acquisitionDate: v.optional(v.string()),
    acquisitionValue: v.optional(v.number()),
    location: v.optional(v.string()),
    status: v.union(v.literal("ativo"), v.literal("inativo"), v.literal("manutencao")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.name) throw new Error("Nome é obrigatório");
    const now = Date.now();
    return await ctx.db.insert("assets", { ...args, createdAt: now, updatedAt: now });
  },
});

export const updateAsset = mutation({
  args: {
    id: v.id("assets"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    acquisitionDate: v.optional(v.string()),
    acquisitionValue: v.optional(v.number()),
    location: v.optional(v.string()),
    status: v.optional(v.union(v.literal("ativo"), v.literal("inativo"), v.literal("manutencao"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

export const deleteAsset = mutation({
  args: { id: v.id("assets") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
