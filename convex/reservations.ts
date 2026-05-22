/**
 * reservations.ts — Reservas de áreas comuns
 *
 * Política de exclusão: reservas nunca são deletadas permanentemente.
 * - createReservation: qualquer usuário logado (morador ou acima)
 * - updateReservation / deleteReservation: apenas diretoria ou sysadmin
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./auth";

// Retorna todas as reservas não inativadas (painel admin)
export const getAllReservations = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("reservations").collect();
    const visible = all.filter((r) => r.deletedAt === undefined);
    return visible.sort((a, b) => b.date.localeCompare(a.date));
  },
});

// Retorna reservas de uma unidade específica (portal do associado)
export const getReservationsByUnit = query({
  args: { unit: v.string() },
  handler: async (ctx, { unit }) => {
    const all = await ctx.db
      .query("reservations")
      .withIndex("by_unit", (q) => q.eq("unit", unit))
      .collect();
    const visible = all.filter((r) => r.deletedAt === undefined);
    return visible.sort((a, b) => b.date.localeCompare(a.date));
  },
});

export const createReservation = mutation({
  args: {
    sessionToken: v.string(),
    area: v.string(),
    unit: v.string(),
    residentName: v.string(),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    status: v.union(
      v.literal("pendente"),
      v.literal("confirmada"),
      v.literal("cancelada")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, ...args }) => {
    // Qualquer usuário logado pode criar uma reserva
    await requireRole(ctx.db, sessionToken, "morador");

    if (!args.unit || !args.residentName || !args.date)
      throw new Error("Unidade, morador e data são obrigatórios");
    const now = Date.now();
    return await ctx.db.insert("reservations", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateReservation = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("reservations"),
    area: v.optional(v.string()),
    unit: v.optional(v.string()),
    residentName: v.optional(v.string()),
    date: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("pendente"),
        v.literal("confirmada"),
        v.literal("cancelada")
      )
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, id, ...fields }) => {
    // Apenas diretoria confirma, cancela ou altera reservas
    await requireRole(ctx.db, sessionToken, "diretoria");
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

/**
 * "Exclui" uma reserva — soft delete + status cancelada.
 */
export const deleteReservation = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("reservations"),
  },
  handler: async (ctx, { sessionToken, id }) => {
    // Apenas diretoria pode cancelar/inativar reservas
    await requireRole(ctx.db, sessionToken, "diretoria");

    await ctx.db.patch(id, {
      status: "cancelada",
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
