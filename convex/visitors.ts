import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getAllVisitors = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("visitors").collect();
    return all.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const createVisitor = mutation({
  args: {
    name: v.string(),
    document: v.optional(v.string()),
    unit: v.string(),
    residentName: v.optional(v.string()),
    date: v.string(),
    entryTime: v.string(),
    exitTime: v.optional(v.string()),
    purpose: v.optional(v.string()),
    vehicle: v.optional(v.string()),
    status: v.union(v.literal("presente"), v.literal("saiu")),
  },
  handler: async (ctx, args) => {
    if (!args.name || !args.unit || !args.date || !args.entryTime) {
      throw new Error("Nome, unidade, data e hora de entrada são obrigatórios");
    }
    const now = Date.now();
    return await ctx.db.insert("visitors", { ...args, createdAt: now });
  },
});

export const updateVisitor = mutation({
  args: {
    id: v.id("visitors"),
    name: v.optional(v.string()),
    document: v.optional(v.string()),
    unit: v.optional(v.string()),
    residentName: v.optional(v.string()),
    date: v.optional(v.string()),
    entryTime: v.optional(v.string()),
    exitTime: v.optional(v.string()),
    purpose: v.optional(v.string()),
    vehicle: v.optional(v.string()),
    status: v.optional(v.union(v.literal("presente"), v.literal("saiu"))),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
  },
});

export const deleteVisitor = mutation({
  args: { id: v.id("visitors") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
