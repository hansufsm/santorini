import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { requireRole, escapeMarkdown } from "./_lib";
import { api } from "./_generated/api";

export const generateLinkingCode = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx.db, args.sessionToken, "morador");

    const flag = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", "integration_telegram"))
      .first();
    const isEnabled = flag ? flag.enabled : false;
    if (!isEnabled) {
      throw new Error("A integração do Telegram com moradores está desativada no momento.");
    }
    
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
    const flag = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", "integration_telegram"))
      .first();
    const isEnabled = flag ? flag.enabled : false;
    if (!isEnabled) {
      return { success: false, error: "A integração do Telegram com moradores está desativada no momento." };
    }

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

    const flag = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", "integration_telegram"))
      .first();
    const isEnabled = flag ? flag.enabled : false;
    if (!isEnabled) {
      return { linked: false };
    }

    return {
      linked: !!user.telegramChatId,
      verificationCode: user.telegramVerificationCode,
      chatId: user.telegramChatId,
    };
  },
});

export const sendAlertAction = action({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!token || !chatId) {
      console.warn("TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurados.");
      return;
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: args.text,
          parse_mode: "Markdown",
        }),
      });
      if (!res.ok) {
        console.error(`Telegram API sendAlertAction error: ${res.statusText}`);
      }
    } catch (err) {
      console.error("Erro ao enviar alerta para o Telegram:", err);
    }
  },
});

export const logStatementAccess = mutation({
  args: {
    associateName: v.string(),
    unit: v.string(),
    url: v.string(),
    type: v.string(), // "Público" ou "Portal"
    viewerUserId: v.optional(v.string()),
    viewerName: v.optional(v.string()),
    isBot: v.optional(v.boolean()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const escapedName = escapeMarkdown(args.associateName);
    const escapedUnit = args.unit ? escapeMarkdown(args.unit) : "Sem Unidade";
    const typeStr = escapeMarkdown(args.type);
    const escapedUrl = escapeMarkdown(args.url);
    
    let viewerStr = "👋 Visitante Humano (Não-Logado)";
    if (args.viewerUserId) {
      viewerStr = `👤 *Usuário Logado:* ${escapeMarkdown(args.viewerName || "Usuário")} (ID: ${escapeMarkdown(args.viewerUserId)})`;
    } else if (args.isBot) {
      viewerStr = `🤖 *Robô / Crawler / Script*`;
    }

    let deviceDetail = "";
    if (args.userAgent) {
      // Pega os primeiros 80 caracteres do User-Agent para não estourar limite da mensagem
      const shortUA = args.userAgent.slice(0, 80);
      deviceDetail = `\n*Navegador/User-Agent:* ${escapeMarkdown(shortUA)}...`;
    }

    const alertText = `👁️ *Acesso ao Extrato (${typeStr})*
*Associado:* ${escapedName}
*Unidade:* ${escapedUnit}
*URL:* ${escapedUrl}
*Origem do Acesso:* ${viewerStr}${deviceDetail}`;

    await ctx.scheduler.runAfter(0, api.telegram.sendAlertAction, { text: alertText });
    return { success: true };
  },
});
