/**
 * announcements.ts — Comunicados do condomínio
 *
 * Política de exclusão: comunicados nunca são deletados permanentemente.
 * A função "deleteAnnouncement" agora faz soft delete (preenche deletedAt).
 * Assim o histórico é mantido, mas o comunicado some das listagens normais.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Retorna todos os comunicados não inativados (visão do painel admin)
export const getAllAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("announcements").collect();

    // Filtrar os que foram inativados (soft delete)
    const visible = all.filter((a) => a.deletedAt === undefined);

    // Ordenar do mais recente para o mais antigo
    return visible.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Retorna apenas comunicados ativos e não inativados (portal do associado + público)
export const getActiveAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db
      .query("announcements")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    // Filtrar os que foram inativados (soft delete) mesmo que active=true
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
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
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

/**
 * "Exclui" um comunicado — na prática, apenas o inativa (soft delete).
 * O registro permanece no banco com deletedAt preenchido.
 * Para auditoria futura, pode-se criar uma query "getAllAnnouncementsHistory".
 */
export const deleteAnnouncement = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, { id }) => {
    // Soft delete: marcar como inativo e preencher deletedAt
    await ctx.db.patch(id, {
      active: false,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
