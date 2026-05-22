import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getAllReservations = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("reservations").collect();
    return all.sort((a, b) => b.date.localeCompare(a.date));
  },
});

export const createReservation = mutation({
  args: {
    area: v.string(),
    unit: v.string(),
    residentName: v.string(),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    status: v.union(v.literal("pendente"), v.literal("confirmada"), v.literal("cancelada")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.unit || !args.residentName || !args.date) throw new Error("Unidade, morador e data são obrigatórios");
    const now = Date.now();
    return await ctx.db.insert("reservations", { ...args, createdAt: now, updatedAt: now });
  },
});

export const updateReservation = mutation({
  args: {
    id: v.id("reservations"),
    area: v.optional(v.string()),
    unit: v.optional(v.string()),
    residentName: v.optional(v.string()),
    date: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    status: v.optional(v.union(v.literal("pendente"), v.literal("confirmada"), v.literal("cancelada"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

export const deleteReservation = mutation({
  args: { id: v.id("reservations") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
