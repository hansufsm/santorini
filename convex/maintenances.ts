/**
 * maintenances.ts — Chamados de manutenção / suporte
 *
 * Política de exclusão: chamados nunca são deletados permanentemente.
 * - createMaintenance: qualquer usuário logado pode abrir um chamado
 * - updateMaintenance / deleteMaintenance: apenas diretoria
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./_lib";

// Retorna todos os chamados não inativados
export const getAllMaintenances = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("maintenances").collect();
    const visible = all.filter((m) => m.deletedAt === undefined);
    return visible.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const createMaintenance = mutation({
  args: {
    sessionToken: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    area: v.optional(v.string()),
    priority: v.union(
      v.literal("baixa"),
      v.literal("media"),
      v.literal("alta"),
      v.literal("urgente")
    ),
    status: v.union(
      v.literal("aberto"),
      v.literal("em_andamento"),
      v.literal("concluido"),
      v.literal("cancelado")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, ...args }) => {
    // Qualquer usuário logado pode abrir um chamado de suporte
    await requireRole(ctx.db, sessionToken, "morador");

    if (!args.title) throw new Error("Título é obrigatório");
    const now = Date.now();
    return await ctx.db.insert("maintenances", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateMaintenance = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("maintenances"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    area: v.optional(v.string()),
    priority: v.optional(
      v.union(
        v.literal("baixa"),
        v.literal("media"),
        v.literal("alta"),
        v.literal("urgente")
      )
    ),
    status: v.optional(
      v.union(
        v.literal("aberto"),
        v.literal("em_andamento"),
        v.literal("concluido"),
        v.literal("cancelado")
      )
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, id, ...fields }) => {
    // Apenas diretoria pode atualizar chamados
    await requireRole(ctx.db, sessionToken, "diretoria");
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

/**
 * "Exclui" um chamado — soft delete + status cancelado.
 */
export const deleteMaintenance = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("maintenances"),
  },
  handler: async (ctx, { sessionToken, id }) => {
    // Apenas diretoria pode inativar chamados
    await requireRole(ctx.db, sessionToken, "diretoria");

    await ctx.db.patch(id, {
      status: "cancelado",
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
