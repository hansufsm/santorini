import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { escapeMarkdown } from "./_lib";

export const registerBlock = mutation({
  args: {
    ip: v.string(),
    details: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // 1. Registrar o bloqueio na tabela securityLogs com timestamp
    await ctx.db.insert("securityLogs", {
      ip: args.ip,
      timestamp: now,
      details: args.details,
    });

    // 2. Contar quantos bloqueios de IPs diferentes ocorreram nos últimos 5 minutos
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    const logs = await ctx.db
      .query("securityLogs")
      .withIndex("by_timestamp", (q) => q.gt(q.field("timestamp"), fiveMinutesAgo))
      .collect();

    const uniqueIps = new Set(logs.map((l) => l.ip));

    // Se mais de 3 IPs diferentes foram bloqueados nos últimos 5 minutos, desativa a rota
    if (uniqueIps.size >= 3) {
      const setting = await ctx.db
        .query("systemSettings")
        .withIndex("by_key", (q) => q.eq("key", "public_extratos_ativo"))
        .first();

      let alreadyDisabled = false;

      if (setting) {
        if (!setting.enabled) {
          alreadyDisabled = true;
        } else {
          await ctx.db.patch(setting._id, {
            enabled: false,
            updatedAt: now,
          });
        }
      } else {
        await ctx.db.insert("systemSettings", {
          key: "public_extratos_ativo",
          label: "Extrato Público Ativo",
          description: "Permite a consulta pública ao extrato financeiro anual simplificado usando o CPF na raiz (/CPF).",
          enabled: false,
          category: "sistema",
          updatedAt: now,
        });
      }

      // Evita enviar alertas duplicados caso já estivesse desativado
      if (!alreadyDisabled) {
        const alertText = `🚨 *ALERTA DE SEGURANÇA CRÍTICO*
O acesso público aos extratos foi *DESATIVADO AUTOMATICAMENTE* (Circuit Breaker).
*Motivo:* Tentativa de força bruta/varredura detectada.
*IPs Diferentes Bloqueados (últimos 5 min):* ${uniqueIps.size}
*Detalhes:* ${escapeMarkdown(args.details)}`;

        await ctx.scheduler.runAfter(0, api.telegram.sendAlertAction, { text: alertText });
      }
    }
  },
});
