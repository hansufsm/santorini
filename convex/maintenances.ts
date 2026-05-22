/**
 * maintenances.ts — Chamados de manutenção
 *
 * Política: chamados nunca são deletados permanentemente.
 * deleteMaintenance faz soft delete (preenche deletedAt + status=cancelado).
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Retorna todos os chamados não inativados (painel admin)
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
    scheduledDate: v.optional(v.string()),  // data prevista para execução
    completedDate: v.optional(v.string()),  // data de conclusão real
    cost: v.optional(v.number()),           // custo do serviço
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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
    scheduledDate: v.optional(v.string()),
    completedDate: v.optional(v.string()),
    cost: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

// Soft delete — cancela e marca deletedAt
export const deleteMaintenance = mutation({
  args: { id: v.id("maintenances") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, {
      status: "cancelado",
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
