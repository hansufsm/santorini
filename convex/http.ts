import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/telegram-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.error("TELEGRAM_BOT_TOKEN environment variable not set");
      return new Response("Configuration Error", { status: 500 });
    }

    try {
      const { message } = await request.json();
      if (!message || !message.chat) {
        return new Response("OK", { status: 200 });
      }

      const chatId = message.chat.id.toString();
      const text = (message.text || "").trim();

      // Verificar se a integração com moradores está ativa
      const flags = await ctx.runQuery(api.settings.getFlags, {});
      const isTelegramUserEnabled = flags?.integration_telegram ?? false;

      if (!isTelegramUserEnabled) {
        return new Response("OK", { status: 200 });
      }

      // COMANDO: /start [codigo]
      if (text.startsWith("/start")) {
        const parts = text.split(" ");
        const code = parts[1];

        if (!code) {
          await sendTelegramMessage(
            token,
            chatId,
            "Bem-vindo ao Santorini Bot! 🏠\n\nPara vincular sua conta e registrar feedbacks, acesse o portal do Santorini em 'Meu Cadastro', gere seu código de vinculação e clique no link fornecido."
          );
          return new Response("OK", { status: 200 });
        }

        const result = await ctx.runMutation(api.telegram.verifyAndLink, {
          chatId,
          code,
        });

        if (result.success) {
          await sendTelegramMessage(
            token,
            chatId,
            `Olá, ${result.name}! 🎉\n\nSeu Telegram foi vinculado com sucesso à Unidade ${result.unit}!\n\nAgora você pode usar os seguintes comandos:\n👉 /feedback [sua mensagem] - Envia uma sugestão ou reclamação para a diretoria\n👉 /reservas - Consulta suas próximas reservas de áreas comuns`
          );
        } else {
          await sendTelegramMessage(
            token,
            chatId,
            `❌ Falha na vinculação:\n${result.error}`
          );
        }

        return new Response("OK", { status: 200 });
      }

      // 2. Localizar usuário vinculado
      const user = await ctx.runQuery(api.telegram.getUserByChatId, { chatId });
      if (!user) {
        await sendTelegramMessage(
          token,
          chatId,
          "⚠️ Seu Telegram ainda não está vinculado a nenhuma conta no Santorini.\n\nPor favor, acesse o portal web do Santorini > Meu Cadastro para obter seu código de vinculação e ative a integração."
        );
        return new Response("OK", { status: 200 });
      }

      // COMANDO: /feedback [mensagem]
      if (text.toLowerCase().startsWith("/feedback")) {
        const content = text.substring(9).trim(); // Remove "/feedback"

        if (content.length < 5) {
          await sendTelegramMessage(
            token,
            chatId,
            "⚠️ Por favor, escreva um feedback um pouco mais detalhado (mínimo de 5 caracteres).\nExemplo:\n/feedback Lâmpada do bloco B queimada."
          );
          return new Response("OK", { status: 200 });
        }

        await ctx.runMutation(api.telegram.createFeedbackFromTelegram, {
          userId: user._id,
          message: content,
        });

        await sendTelegramMessage(
          token,
          chatId,
          "✅ Obrigado! Seu feedback foi recebido pela diretoria do residencial Santorini."
        );
        return new Response("OK", { status: 200 });
      }

      // COMANDO: /reservas
      if (text.toLowerCase() === "/reservas") {
        const reservations = await ctx.runQuery(api.telegram.getUserReservations, {
          userId: user._id,
        });

        if (reservations.length === 0) {
          await sendTelegramMessage(
            token,
            chatId,
            `📅 Nenhuma reserva ativa ou futura encontrada para a Unidade ${user.unit ?? "—"}.`
          );
        } else {
          const list = reservations
            .map(
              (r) =>
                `• *${r.area}*\n  Data: ${formatDateString(r.date)} das ${r.startTime} às ${r.endTime}\n  Status: ${r.status}`
            )
            .join("\n\n");

          await sendTelegramMessage(
            token,
            chatId,
            `📅 *Suas próximas reservas (Unidade ${user.unit ?? "—"}):* \n\n${list}`
          );
        }
        return new Response("OK", { status: 200 });
      }

      // Mensagem padrão
      await sendTelegramMessage(
        token,
        chatId,
        `Olá, ${user.name}! 🏠\n\nComo posso ajudar você hoje?\n\nOpções:\n👉 /feedback [mensagem] - Registrar uma sugestão/problema\n👉 /reservas - Listar suas reservas`
      );

      return new Response("OK", { status: 200 });
    } catch (err: any) {
      console.error("Error processing telegram webhook:", err);
      return new Response("Internal Server Error", { status: 500 });
    }
  }),
});

async function sendTelegramMessage(token: string, chatId: string, text: string) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });
    if (!res.ok) {
      console.error(`Telegram API error: ${res.statusText}`);
    }
  } catch (err) {
    console.error("Failed to send message to Telegram:", err);
  }
}

function formatDateString(isoDate: string) {
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default http;
