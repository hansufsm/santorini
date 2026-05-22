import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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
  })
    .index("by_date", ["date"])
    .index("by_key", ["transactionKey"])
    .index("by_detail", ["detail"])
    .index("by_date_detail", ["date", "detail"]),

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
  })
    .index("by_status", ["status"])
    .index("by_unit", ["unit"])
    .index("by_name", ["name"]),

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
  })
    .index("by_date", ["date"])
    .index("by_unit", ["unit"])
    .index("by_status", ["status"]),

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
  })
    .index("by_active", ["active"])
    .index("by_type", ["type"]),

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
  })
    .index("by_status", ["status"])
    .index("by_priority", ["priority"]),
});
