/**
 * announcements.ts — Comunicados do residencial
 *
 * Política de exclusão: comunicados nunca são deletados permanentemente.
 * A função "deleteAnnouncement" agora faz soft delete (preenche deletedAt).
 * Mutations que alteram dados exigem papel mínimo "diretoria".
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole, isUserActive } from "./_lib";

const USER_ROLES = ["morador", "associado", "diretoria", "sysadmin"] as const;

const roleValidator = v.union(
  v.literal("morador"),
  v.literal("associado"),
  v.literal("diretoria"),
  v.literal("sysadmin")
);

const announcementTypeValidator = v.union(
  v.literal("info"),
  v.literal("urgente"),
  v.literal("manutencao"),
  v.literal("evento")
);

type UserRole = (typeof USER_ROLES)[number];

function normalizeTargetRoles(targetRoles?: UserRole[]) {
  if (!targetRoles || targetRoles.length === 0) return undefined;
  const unique = Array.from(new Set(targetRoles.filter((role) => USER_ROLES.includes(role))));
  return unique.length === USER_ROLES.length ? undefined : unique;
}

function isVisibleForRole(announcement: { targetRoles?: UserRole[] }, role?: string) {
  if (!announcement.targetRoles || announcement.targetRoles.length === 0) return true;
  return Boolean(role && announcement.targetRoles.includes(role as UserRole));
}

async function getRoleFromSession(db: any, sessionToken?: string) {
  if (!sessionToken) return undefined;
  const session = await db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", sessionToken))
    .first();

  if (!session || session.expiresAt < Date.now()) return undefined;
  const user = await db.get(session.userId);
  if (!user || !isUserActive(user)) return undefined;
  return user.role as string | undefined;
}

// Retorna todos os comunicados não inativados (visão do painel admin)
export const getAllAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("announcements").collect();
    const visible = all.filter((a) => a.deletedAt === undefined);
    return visible.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Retorna apenas comunicados ativos e não inativados filtrados pela role da sessão.
// Comunicados antigos sem targetRoles continuam visíveis para todos.
export const getActiveAnnouncements = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken }) => {
    const role = await getRoleFromSession(ctx.db, sessionToken);
    const all = await ctx.db
      .query("announcements")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    const visible = all.filter((a) => a.deletedAt === undefined && isVisibleForRole(a, role));
    return visible.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const createAnnouncement = mutation({
  args: {
    sessionToken: v.string(),
    title: v.string(),
    content: v.string(),
    type: announcementTypeValidator,
    active: v.boolean(),
    targetRoles: v.optional(v.array(roleValidator)),
  },
  handler: async (ctx, { sessionToken, targetRoles, ...args }) => {
    // Apenas diretoria ou sysadmin podem criar comunicados
    await requireRole(ctx.db, sessionToken, "diretoria");

    if (!args.title) throw new Error("Título é obrigatório");
    const now = Date.now();
    return await ctx.db.insert("announcements", {
      ...args,
      targetRoles: normalizeTargetRoles(targetRoles),
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
    type: v.optional(announcementTypeValidator),
    active: v.optional(v.boolean()),
    targetRoles: v.optional(v.array(roleValidator)),
  },
  handler: async (ctx, { sessionToken, id, targetRoles, ...fields }) => {
    // Apenas diretoria ou sysadmin podem editar comunicados
    await requireRole(ctx.db, sessionToken, "diretoria");
    await ctx.db.patch(id, {
      ...fields,
      ...(targetRoles !== undefined ? { targetRoles: normalizeTargetRoles(targetRoles) } : {}),
      updatedAt: Date.now(),
    });
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
