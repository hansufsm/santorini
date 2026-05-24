/**
 * trilhaViva.ts — Persistência da Trilha Viva Santorini
 *
 * Registra o progresso individual dos microtutoriais por usuário, rota, menu e role.
 * A experiência do portal pode funcionar com fallback local, mas usuários autenticados
 * passam a manter histórico remoto no Convex para retomada entre dispositivos.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./_lib";

const DEFAULT_ASSOCIATION_ID = "amrts";
const MAX_ROUTE_LENGTH = 300;
const MAX_MENU_LABEL_LENGTH = 80;

const roleValidator = v.union(
  v.literal("sysadmin"),
  v.literal("diretoria"),
  v.literal("associado"),
  v.literal("morador")
);

const statusValidator = v.union(
  v.literal("nao_iniciado"),
  v.literal("em_andamento"),
  v.literal("concluido"),
  v.literal("reiniciado")
);

function normalizeOptionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeGuideId(route: string, role: string) {
  return `${role}:${route}`.replace(/\s+/g, "-").toLowerCase();
}

function normalizeRoute(route: string) {
  const trimmed = route.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.length > MAX_ROUTE_LENGTH) {
    throw new Error("Rota inválida para registrar a Trilha Viva.");
  }
  return trimmed;
}

function normalizeMenuLabel(menuLabel: string) {
  const trimmed = menuLabel.trim();
  if (!trimmed || trimmed.length > MAX_MENU_LABEL_LENGTH) {
    throw new Error("Nome do menu inválido para registrar a Trilha Viva.");
  }
  return trimmed;
}

async function findProgress(ctx: any, userId: any, guideId: string) {
  return await ctx.db
    .query("trilhaVivaProgress")
    .withIndex("by_user_guide", (q: any) => q.eq("userId", userId).eq("guideId", guideId))
    .first();
}

export const getMyProgress = query({
  args: {
    sessionToken: v.string(),
    route: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx.db, args.sessionToken, "morador");
    const route = normalizeRoute(args.route);
    const guideId = normalizeGuideId(route, user.role);
    const progress = await findProgress(ctx, user._id, guideId);

    if (!progress || progress.deletedAt !== undefined) {
      return null;
    }

    return progress;
  },
});

export const touchGuide = mutation({
  args: {
    sessionToken: v.string(),
    associationId: v.optional(v.string()),
    route: v.string(),
    menuLabel: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx.db, args.sessionToken, "morador");
    const route = normalizeRoute(args.route);
    const menuLabel = normalizeMenuLabel(args.menuLabel);
    const associationId = normalizeOptionalText(args.associationId) ?? DEFAULT_ASSOCIATION_ID;
    const guideId = normalizeGuideId(route, user.role);
    const now = Date.now();
    const existing = await findProgress(ctx, user._id, guideId);

    if (existing && existing.deletedAt === undefined) {
      await ctx.db.patch(existing._id, {
        associationId,
        route,
        menuLabel,
        userRole: user.role,
        lastOpenedAt: now,
        status: existing.status === "concluido" ? existing.status : "em_andamento",
        updatedAt: now,
      });
      return { success: true, id: existing._id };
    }

    const id = await ctx.db.insert("trilhaVivaProgress", {
      associationId,
      guideId,
      route,
      menuLabel,
      userId: user._id,
      userRole: user.role,
      status: "em_andamento",
      lastOpenedAt: now,
      completionCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, id };
  },
});

export const completeGuide = mutation({
  args: {
    sessionToken: v.string(),
    associationId: v.optional(v.string()),
    route: v.string(),
    menuLabel: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx.db, args.sessionToken, "morador");
    const route = normalizeRoute(args.route);
    const menuLabel = normalizeMenuLabel(args.menuLabel);
    const associationId = normalizeOptionalText(args.associationId) ?? DEFAULT_ASSOCIATION_ID;
    const guideId = normalizeGuideId(route, user.role);
    const now = Date.now();
    const existing = await findProgress(ctx, user._id, guideId);

    if (existing && existing.deletedAt === undefined) {
      await ctx.db.patch(existing._id, {
        associationId,
        route,
        menuLabel,
        userRole: user.role,
        status: "concluido",
        completedAt: now,
        lastOpenedAt: now,
        completionCount: (existing.completionCount ?? 0) + 1,
        updatedAt: now,
      });
      return { success: true, id: existing._id };
    }

    const id = await ctx.db.insert("trilhaVivaProgress", {
      associationId,
      guideId,
      route,
      menuLabel,
      userId: user._id,
      userRole: user.role,
      status: "concluido",
      completedAt: now,
      lastOpenedAt: now,
      completionCount: 1,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, id };
  },
});

export const restartGuide = mutation({
  args: {
    sessionToken: v.string(),
    route: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx.db, args.sessionToken, "morador");
    const route = normalizeRoute(args.route);
    const guideId = normalizeGuideId(route, user.role);
    const existing = await findProgress(ctx, user._id, guideId);

    if (!existing || existing.deletedAt !== undefined) {
      return { success: true, restarted: false };
    }

    const now = Date.now();
    await ctx.db.patch(existing._id, {
      status: "reiniciado",
      completedAt: undefined,
      restartedAt: now,
      lastOpenedAt: now,
      updatedAt: now,
    });

    return { success: true, restarted: true };
  },
});

export const listProgress = query({
  args: {
    sessionToken: v.string(),
    associationId: v.optional(v.string()),
    status: v.optional(statusValidator),
    role: v.optional(roleValidator),
    route: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.sessionToken, "diretoria");

    const associationId = normalizeOptionalText(args.associationId) ?? DEFAULT_ASSOCIATION_ID;
    const route = normalizeOptionalText(args.route);
    const all = await ctx.db.query("trilhaVivaProgress").collect();

    return all
      .filter((item) => item.deletedAt === undefined)
      .filter((item) => item.associationId === associationId)
      .filter((item) => !args.status || item.status === args.status)
      .filter((item) => !args.role || item.userRole === args.role)
      .filter((item) => !route || item.route === route)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const getProgressSummary = query({
  args: {
    sessionToken: v.string(),
    associationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.sessionToken, "diretoria");

    const associationId = normalizeOptionalText(args.associationId) ?? DEFAULT_ASSOCIATION_ID;
    const all = await ctx.db.query("trilhaVivaProgress").collect();
    const active = all.filter((item) => item.deletedAt === undefined && item.associationId === associationId);

    const totals = active.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[item.status] += 1;
        return acc;
      },
      { total: 0, nao_iniciado: 0, em_andamento: 0, concluido: 0, reiniciado: 0 }
    );

    const byRoute = active.reduce<Record<string, { route: string; menuLabel: string; total: number; completed: number; inProgress: number; restarted: number }>>(
      (acc, item) => {
        if (!acc[item.route]) {
          acc[item.route] = {
            route: item.route,
            menuLabel: item.menuLabel,
            total: 0,
            completed: 0,
            inProgress: 0,
            restarted: 0,
          };
        }
        acc[item.route].total += 1;
        if (item.status === "concluido") acc[item.route].completed += 1;
        if (item.status === "em_andamento") acc[item.route].inProgress += 1;
        if (item.status === "reiniciado") acc[item.route].restarted += 1;
        return acc;
      },
      {}
    );

    return {
      totals,
      byRoute: Object.values(byRoute).sort((a, b) => b.total - a.total),
      recent: active.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 20),
    };
  },
});
