/**
 * announcements.ts — Comunicados do residencial
 *
 * Política de exclusão: comunicados nunca são deletados permanentemente.
 * A função "deleteAnnouncement" agora faz soft delete (preenche deletedAt).
 * Mutations que alteram dados exigem papel mínimo "diretoria".
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./auth";

// Retorna todos os comunicados não inativados (visão do painel admin)
export const getAllAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("announcements").collect();
    const visible = all.filter((a) => a.deletedAt === undefined);
    return visible.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Retorna apenas comunicados ativos e não inativados (portal + público)
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
    sessionToken: v.string(),
    title: v.string(),
    content: v.string(),
    type: v.union(
      v.literal("info"),
      v.literal("urgente"),
      v.literal("manutencao"),
      v.literal("evento")
    ),
    active: v.boolean(),
  },
  handler: async (ctx, { sessionToken, ...args }) => {
    // Apenas diretoria ou sysadmin podem criar comunicados
    await requireRole(ctx.db, sessionToken, "diretoria");

    if (!args.title) throw new Error("Título é obrigatório");
    const now = Date.now();
    return await ctx.db.insert("announcements", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateAnnouncement = mutation({
  args: {
    sessionToken: v.string(),
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
  handler: async (ctx, { sessionToken, id, ...fields }) => {
    // Apenas diretoria ou sysadmin podem editar comunicados
    await requireRole(ctx.db, sessionToken, "diretoria");
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

/**
 * "Exclui" um comunicado — soft delete.
 * O registro permanece no banco com deletedAt preenchido para histórico.
 */
export const deleteAnnouncement = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("announcements"),
  },
  handler: async (ctx, { sessionToken, id }) => {
    // Apenas diretoria ou sysadmin podem inativar comunicados
    await requireRole(ctx.db, sessionToken, "diretoria");

    await ctx.db.patch(id, {
      active: false,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
