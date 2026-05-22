import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── ASSEMBLEIAS ──────────────────────────────────────────────────────────────

export const createAssembly = mutation({
  args: {
    date: v.string(),
    type: v.union(v.literal("ordinaria"), v.literal("extraordinaria")),
    location: v.optional(v.string()),
    agenda: v.string(),
    minutes: v.optional(v.string()),
    attendees: v.optional(v.number()),
    status: v.union(v.literal("agendada"), v.literal("realizada"), v.literal("cancelada")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("assemblies", { ...args, createdAt: now, updatedAt: now });
  },
});

export const updateAssembly = mutation({
  args: {
    id: v.id("assemblies"),
    date: v.optional(v.string()),
    type: v.optional(v.union(v.literal("ordinaria"), v.literal("extraordinaria"))),
    location: v.optional(v.string()),
    agenda: v.optional(v.string()),
    minutes: v.optional(v.string()),
    attendees: v.optional(v.number()),
    status: v.optional(v.union(v.literal("agendada"), v.literal("realizada"), v.literal("cancelada"))),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

export const deleteAssembly = mutation({
  args: { id: v.id("assemblies") },
  handler: async (ctx, { id }) => {
    // Apaga também os votos associados
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_assembly", (q) => q.eq("assemblyId", id))
      .collect();
    for (const vote of votes) await ctx.db.delete(vote._id);
    await ctx.db.delete(id);
  },
});

export const getAllAssemblies = query({
  args: {},
  handler: async (ctx) => {
    const assemblies = await ctx.db.query("assemblies").collect();
    const sorted = assemblies.sort((a, b) => b.date.localeCompare(a.date));
    // Busca votos de cada assembleia
    const result = await Promise.all(
      sorted.map(async (assembly) => {
        const votes = await ctx.db
          .query("votes")
          .withIndex("by_assembly", (q) => q.eq("assemblyId", assembly._id))
          .collect();
        return { ...assembly, votes };
      })
    );
    return result;
  },
});

// ─── VOTOS ────────────────────────────────────────────────────────────────────

export const createVote = mutation({
  args: {
    assemblyId: v.id("assemblies"),
    title: v.string(),
    options: v.array(v.object({ label: v.string(), count: v.number() })),
    result: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("votes", { ...args, createdAt: Date.now() });
  },
});

export const updateVote = mutation({
  args: {
    id: v.id("votes"),
    title: v.optional(v.string()),
    options: v.optional(v.array(v.object({ label: v.string(), count: v.number() }))),
    result: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
  },
});

export const deleteVote = mutation({
  args: { id: v.id("votes") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
