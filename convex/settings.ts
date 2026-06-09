import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./_lib";

const DEFAULT_FLAGS = [
  {
    key: "module_reservations",
    label: "Reservas de Áreas Comuns",
    description: "Agendamentos de churrasqueira, salão de festas e áreas comuns por moradores.",
    enabled: true,
    category: "modulo" as const,
  },
  {
    key: "module_announcements",
    label: "Comunicados",
    description: "Visualização do painel de avisos e informativos da administração.",
    enabled: true,
    category: "modulo" as const,
  },
  {
    key: "module_maintenance",
    label: "Chamados de Manutenção",
    description: "Abertura e acompanhamento de chamados técnicos e reparos de infraestrutura.",
    enabled: true,
    category: "modulo" as const,
  },
  {
    key: "module_visitors",
    label: "Controle de Visitantes",
    description: "Registro de entrada e saída de visitantes pela portaria.",
    enabled: true,
    category: "modulo" as const,
  },
  {
    key: "module_feedback",
    label: "Feedback Comunitário",
    description: "Canal direto para envio de sugestões, reclamações ou elogios.",
    enabled: true,
    category: "modulo" as const,
  },
  {
    key: "module_trilha_viva",
    label: "Trilha Viva",
    description: "Microtutoriais guiados e dicas interativas em cada tela do sistema.",
    enabled: true,
    category: "modulo" as const,
  },
  {
    key: "module_extrato",
    label: "Extrato Financeiro",
    description: "Exibição do fluxo de caixa e histórico de transações detalhado para associados.",
    enabled: true,
    category: "modulo" as const,
  },
  {
    key: "module_mensalidade",
    label: "Verificação de Pagamento",
    description: "Painel de verificação de mensalidades e status financeiro do associado.",
    enabled: true,
    category: "modulo" as const,
  },
  {
    key: "integration_pcloud",
    label: "Sincronização pCloud",
    description: "Importação e processamento automático de extratos bancários salvos no pCloud.",
    enabled: true,
    category: "integracao" as const,
  },
  {
    key: "integration_telegram",
    label: "Integração Telegram (Moradores)",
    description: "Permite que moradores/usuários vinculem suas contas e interajam pelo Telegram.",
    enabled: false,
    category: "integracao" as const,
  },
  {
    key: "public_extratos_ativo",
    label: "Extrato Público Ativo",
    description: "Permite a consulta pública ao extrato financeiro anual simplificado usando o CPF na raiz (/CPF).",
    enabled: true,
    category: "sistema" as const,
  }
];

export const getFlags = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("systemSettings").collect();
    const flags: Record<string, boolean> = {};

    // Inicializa com padrões
    for (const f of DEFAULT_FLAGS) {
      flags[f.key] = f.enabled;
    }

    // Sobrescreve com valores salvos no banco
    for (const s of settings) {
      flags[s.key] = s.enabled;
    }

    return flags;
  },
});

export const listSettings = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Apenas usuários logados podem ver a lista completa
    if (args.sessionToken) {
      await requireRole(ctx.db, args.sessionToken, "morador");
    }

    const settings = await ctx.db.query("systemSettings").collect();
    
    // Se o banco estiver vazio, retorna os padrões mapeados com IDs fictícios
    if (settings.length === 0) {
      return DEFAULT_FLAGS.map((f, i) => ({
        _id: `default_${i}` as any,
        _creationTime: Date.now(),
        ...f,
      }));
    }

    // Mesclar os padrões que possam estar ausentes no banco
    const merged = [...settings];
    for (const d of DEFAULT_FLAGS) {
      if (!settings.some((s) => s.key === d.key)) {
        merged.push({
          _id: `missing_${d.key}` as any,
          _creationTime: Date.now(),
          ...d,
          updatedAt: Date.now(),
          updatedBy: undefined as any,
        });
      }
    }

    return merged;
  },
});

export const toggleFlag = mutation({
  args: {
    sessionToken: v.string(),
    key: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const caller = await requireRole(ctx.db, args.sessionToken, "sysadmin");

    const existing = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    const now = Date.now();
    let beforeState = "não configurado (padrão ativo)";
    const afterState = args.enabled ? "ativo" : "inativo";

    if (existing) {
      beforeState = existing.enabled ? "ativo" : "inativo";
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        updatedAt: now,
        updatedBy: caller._id,
      });
    } else {
      // Cria o registro baseado nos padrões
      const d = DEFAULT_FLAGS.find((f) => f.key === args.key);
      const label = d?.label ?? args.key;
      const description = d?.description ?? "";
      const category = d?.category ?? "modulo";

      await ctx.db.insert("systemSettings", {
        key: args.key,
        label,
        description,
        enabled: args.enabled,
        category,
        updatedAt: now,
        updatedBy: caller._id,
      });
    }

    // Registrar log de auditoria
    await ctx.db.insert("boardActionLogs", {
      actorUserId: caller._id,
      actorName: caller.name,
      actorRole: caller.role as "sysadmin" | "diretoria",
      action: "alterar_configuracao",
      entity: "systemSettings",
      entityId: args.key,
      entityLabel: DEFAULT_FLAGS.find(f => f.key === args.key)?.label ?? args.key,
      summary: `Alterou estado da funcionalidade '${args.key}' de ${beforeState} para ${afterState}.`,
      before: JSON.stringify({ enabled: beforeState }),
      after: JSON.stringify({ enabled: afterState }),
      createdAt: now,
    });

    return { success: true };
  },
});
