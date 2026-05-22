import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createDocument = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    category: v.union(v.literal("ata"), v.literal("regulamento"), v.literal("contrato"), v.literal("outro")),
    fileUrl: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("documents", { ...args, createdAt: Date.now() });
  },
});

export const updateDocument = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.union(v.literal("ata"), v.literal("regulamento"), v.literal("contrato"), v.literal("outro"))),
    fileUrl: v.optional(v.string()),
    date: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
  },
});

export const deleteDocument = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const getAllDocuments = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("documents").collect();
    return all.sort((a, b) => b.date.localeCompare(a.date));
  },
});

export const getDocumentsByCategory = query({
  args: {
    category: v.union(v.literal("ata"), v.literal("regulamento"), v.literal("contrato"), v.literal("outro")),
  },
  handler: async (ctx, { category }) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_category", (q) => q.eq("category", category))
      .collect();
  },
});
