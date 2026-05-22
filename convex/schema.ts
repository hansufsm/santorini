import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ─── Dados financeiros ────────────────────────────────────────────────────

  transactions: defineTable({
    date: v.string(),
    time: v.string(),
    type: v.string(),
    name: v.string(),
    detail: v.string(),
    value: v.number(),
    originalValue: v.string(),
    transactionKey: v.string(),
    importedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_date", ["date"])
    .index("by_key", ["transactionKey"])
    .index("by_detail", ["detail"])
    .index("by_date_detail", ["date", "detail"]),

  // ─── Cadastro de associados (registro financeiro titular) ─────────────────

  associates: defineTable({
    name: v.string(),
    unit: v.string(),
    cpf: v.optional(v.string()),
    cpfPrefix: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    status: v.union(
      v.literal("ativo"),
      v.literal("inativo"),
      v.literal("inadimplente")
    ),
    joinedAt: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_unit", ["unit"])
    .index("by_name", ["name"]),

  // ─── Reservas de áreas comuns ─────────────────────────────────────────────

  reservations: defineTable({
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
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_date", ["date"])
    .index("by_unit", ["unit"])
    .index("by_status", ["status"]),

  // ─── Comunicados ──────────────────────────────────────────────────────────

  announcements: defineTable({
    title: v.string(),
    content: v.string(),
    type: v.union(
      v.literal("info"),
      v.literal("urgente"),
      v.literal("manutencao"),
      v.literal("evento")
    ),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_active", ["active"])
    .index("by_type", ["type"]),

  // ─── Chamados de manutenção ───────────────────────────────────────────────

  maintenances: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    area: v.optional(v.string()),
    priority: v.union(
      v.literal("baixa"),
      v.literal("media"),
      v.literal("alta"),
      v.literal("urgente")
    ),
    status: v.union(
      v.literal("aberto"),
      v.literal("em_andamento"),
      v.literal("concluido"),
      v.literal("cancelado")
    ),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_priority", ["priority"]),

  // ─── NOVO: Sistema de papéis (RBAC) ──────────────────────────────────────
  //
  // Hierarquia: sysadmin > diretoria > associado > morador
  //
  // • sysadmin  — max 2 ativos; registro imutável por qualquer outro papel
  // • diretoria — gestão de documentos, comunicados, usuários não-sysadmin
  // • associado — titular financeiro da unidade (vinculado a associates)
  // • morador   — familiar/inquilino vinculado ao Associado da unidade

  users: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    passwordHash: v.optional(v.string()),   // SHA-256 hex (Diretoria/Sysadmin)
    role: v.union(
      v.literal("sysadmin"),
      v.literal("diretoria"),
      v.literal("associado"),
      v.literal("morador")
    ),
    status: v.union(v.literal("ativo"), v.literal("inativo")),
    // Associado: link para o registro financeiro na tabela associates
    associateId: v.optional(v.id("associates")),
    // Morador: link ao Associado titular da mesma unidade
    parentAssociateId: v.optional(v.id("associates")),
    unit: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),      // Inativação (nunca exclusão real)
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_status", ["status"])
    .index("by_associate", ["associateId"])
    .index("by_parent_associate", ["parentAssociateId"]),

  // ─── NOVO: Sessões autenticadas ───────────────────────────────────────────
  //
  // Token gerado no login, armazenado no cliente (sessionStorage/cookie).
  // Expiração padrão: 8 horas.

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),
});
