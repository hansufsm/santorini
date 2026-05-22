import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createAnnouncement = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    type: v.union(v.literal("info"), v.literal("urgente"), v.literal("manutencao"), v.literal("evento")),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("announcements", {
      ...args,
      active: args.active ?? true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateAnnouncement = mutation({
  args: {
    id: v.id("announcements"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    type: v.optional(v.union(v.literal("info"), v.literal("urgente"), v.literal("manutencao"), v.literal("evento"))),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

export const deleteAnnouncement = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const getAllAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("announcements").collect();
    return all.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getActiveAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db
      .query("announcements")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    return all.sort((a, b) => b.createdAt - a.createdAt);
  },
});
