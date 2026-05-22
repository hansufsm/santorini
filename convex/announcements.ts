/**
 * announcements.ts — Comunicados do condomínio
 *
 * Política: comunicados nunca são deletados permanentemente.
 * deleteAnnouncement faz soft delete (preenche deletedAt + active=false).
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Retorna todos os comunicados não inativados (painel admin)
export const getAllAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("announcements").collect();
    const visible = all.filter((a) => a.deletedAt === undefined);
    return visible.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Retorna apenas os comunicados ativos e não inativados (portal + público)
export const getActiveAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db
      .query("announcements")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    const visible = all.filter((a) => a.deletedAt === undefined);
    return visible.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const createAnnouncement = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    type: v.union(
      v.literal("info"),
      v.literal("urgente"),
      v.literal("manutencao"),
      v.literal("evento")
    ),
    active: v.optional(v.boolean()), // padrão true
  },
  handler: async (ctx, args) => {
    if (!args.title) throw new Error("Título é obrigatório");
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
    type: v.optional(
      v.union(
        v.literal("info"),
        v.literal("urgente"),
        v.literal("manutencao"),
        v.literal("evento")
      )
    ),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

// Soft delete — o registro fica no banco, apenas some das listagens normais
export const deleteAnnouncement = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, {
      active: false,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
