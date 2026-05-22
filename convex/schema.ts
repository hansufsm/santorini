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

  documents: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    category: v.union(
      v.literal("ata"),
      v.literal("regulamento"),
      v.literal("contrato"),
      v.literal("outro")
    ),
    fileUrl: v.string(),
    date: v.string(),
    createdAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_date", ["date"]),

  assemblies: defineTable({
    date: v.string(),
    type: v.union(v.literal("ordinaria"), v.literal("extraordinaria")),
    location: v.optional(v.string()),
    agenda: v.string(),
    minutes: v.optional(v.string()),
    attendees: v.optional(v.number()),
    status: v.union(
      v.literal("agendada"),
      v.literal("realizada"),
      v.literal("cancelada")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_status", ["status"]),

  votes: defineTable({
    assemblyId: v.id("assemblies"),
    title: v.string(),
    options: v.array(v.object({ label: v.string(), count: v.number() })),
    result: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_assembly", ["assemblyId"]),

  users: defineTable({
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(), // SHA-256 hex
    role: v.union(
      v.literal("sysadmin"),
      v.literal("admin"),
      v.literal("viewer")
    ),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),
});
