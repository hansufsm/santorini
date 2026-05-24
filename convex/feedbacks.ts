/**
 * feedbacks.ts — Feedback Comunitário do Santorini
 *
 * O envio é aberto para visitantes e usuários autenticados, porque o botão global
 * também aparece na área pública. Quando há sessionToken, o backend valida a sessão
 * e registra userId/userRole a partir do próprio banco, evitando confiança em dados
 * enviados pelo cliente.
 *
 * A triagem e alteração de status são restritas à diretoria/sysadmin.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./_lib";

const DEFAULT_ASSOCIATION_ID = "amrts";
const MAX_MESSAGE_LENGTH = 2000;
const MAX_URL_LENGTH = 1000;

type FeedbackStatus = "novo" | "em_analise" | "resolvido" | "arquivado";
type FeedbackCategory = "sugestao" | "problema" | "elogio" | "duvida" | "outro";

const categoryValidator = v.union(
  v.literal("sugestao"),
  v.literal("problema"),
  v.literal("elogio"),
  v.literal("duvida"),
  v.literal("outro")
);

const statusValidator = v.union(
  v.literal("novo"),
  v.literal("em_analise"),
  v.literal("resolvido"),
  v.literal("arquivado")
);

function normalizeOptionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export const createFeedback = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    associationId: v.optional(v.string()),
    category: categoryValidator,
    message: v.string(),
    url: v.string(),
    route: v.string(),
  },
  handler: async (ctx, args) => {
    const message = args.message.trim();
    const url = args.url.trim();
    const route = args.route.trim() || "/";
    const associationId = normalizeOptionalText(args.associationId) ?? DEFAULT_ASSOCIATION_ID;
    const sessionToken = normalizeOptionalText(args.sessionToken);

    if (message.length < 5) {
      throw new Error("Descreva o feedback com pelo menos 5 caracteres.");
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`O feedback deve ter no máximo ${MAX_MESSAGE_LENGTH} caracteres.`);
    }

    if (!url || url.length > MAX_URL_LENGTH) {
      throw new Error("URL inválida para registro do feedback.");
    }

    if (!route || route.length > 300) {
      throw new Error("Rota inválida para registro do feedback.");
    }

    let userId = undefined;
    let userRole = undefined;

    if (sessionToken) {
      const user = await requireRole(ctx.db, sessionToken, "morador");
      userId = user._id;
      userRole = user.role;
    }

    const now = Date.now();
    const id = await ctx.db.insert("feedbacks", {
      associationId,
      category: args.category,
      message,
      url,
      route,
      userId,
      userRole,
      status: "novo",
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, id };
  },
});

export const listFeedbacks = query({
  args: {
    sessionToken: v.string(),
    associationId: v.optional(v.string()),
    status: v.optional(statusValidator),
    category: v.optional(categoryValidator),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.sessionToken, "diretoria");

    const associationId = normalizeOptionalText(args.associationId) ?? DEFAULT_ASSOCIATION_ID;
    const all = await ctx.db.query("feedbacks").collect();

    return all
      .filter((feedback) => feedback.deletedAt === undefined)
      .filter((feedback) => feedback.associationId === associationId)
      .filter((feedback) => !args.status || feedback.status === args.status)
      .filter((feedback) => !args.category || feedback.category === args.category)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const updateFeedbackStatus = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("feedbacks"),
    status: statusValidator,
  },
  handler: async (ctx, { sessionToken, id, status }) => {
    await requireRole(ctx.db, sessionToken, "diretoria");

    const feedback = await ctx.db.get(id);
    if (!feedback || feedback.deletedAt !== undefined) {
      throw new Error("Feedback não encontrado.");
    }

    await ctx.db.patch(id, {
      status,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const archiveFeedback = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("feedbacks"),
  },
  handler: async (ctx, { sessionToken, id }) => {
    await requireRole(ctx.db, sessionToken, "diretoria");

    const feedback = await ctx.db.get(id);
    if (!feedback || feedback.deletedAt !== undefined) {
      throw new Error("Feedback não encontrado.");
    }

    await ctx.db.patch(id, {
      status: "arquivado",
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
