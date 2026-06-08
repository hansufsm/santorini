import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./_lib";

export const generateLinkingCode = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx.db, args.sessionToken, "morador");
    
    // Gera código SAN-XXXXXX onde XXXXXX são 6 dígitos numéricos aleatórios
    const randomNumber = Math.floor(100000 + Math.random() * 900000);
    const code = `SAN-${randomNumber}`;

    await ctx.db.patch(user._id, {
      telegramVerificationCode: code,
    });

    return { code };
  },
});

export const unlinkTelegram = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx.db, args.sessionToken, "morador");

    await ctx.db.patch(user._id, {
      telegramChatId: undefined,
      telegramVerificationCode: undefined,
      telegramLinkedAt: undefined,
    });

    return { success: true };
  },
});

export const verifyAndLink = mutation({
  args: {
    chatId: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const upperCode = args.code.toUpperCase().trim();
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegram_code", (q) => q.eq("telegramVerificationCode", upperCode))
      .first();

    if (!user) {
      return { success: false, error: "Código de vinculação inválido ou expirado." };
    }

    await ctx.db.patch(user._id, {
      telegramChatId: args.chatId,
      telegramVerificationCode: undefined,
      telegramLinkedAt: Date.now(),
    });

    return {
      success: true,
      name: user.name,
      unit: user.unit ?? "—",
    };
  },
});

export const getUserByChatId = query({
  args: {
    chatId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_telegram_chat", (q) => q.eq("telegramChatId", args.chatId))
      .first();
  },
});

export const createFeedbackFromTelegram = mutation({
  args: {
    userId: v.id("users"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Usuário não encontrado.");
    }

    const now = Date.now();
    const id = await ctx.db.insert("feedbacks", {
      associationId: "default",
      category: "sugestao",
      message: args.message.trim(),
      url: "Telegram Bot",
      route: "telegram_bot",
      userId: user._id,
      userRole: user.role,
      status: "novo",
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, id };
  },
});

export const getUserReservations = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.unit) return [];

    const all = await ctx.db
      .query("reservations")
      .withIndex("by_unit", (q) => q.eq("unit", user.unit!))
      .collect();
    
    const visible = all.filter((r) => r.deletedAt === undefined);
    
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const active = visible.filter((r) => r.date >= today);

    return active.sort((a, b) => a.date.localeCompare(b.date));
  },
});

export const getTelegramStatus = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx.db, args.sessionToken, "morador");
    return {
      linked: !!user.telegramChatId,
      verificationCode: user.telegramVerificationCode,
      chatId: user.telegramChatId,
    };
  },
});
