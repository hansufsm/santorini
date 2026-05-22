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
    unit: v.optional(v.string()),       // não obrigatório — CSV de associados não tem unidade
    cpf: v.optional(v.string()),         // CPF completo (só admin vê)
    cpfPrefix: v.optional(v.string()),   // 4 primeiros dígitos — usado no portal público
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    status: v.union(
      v.literal("ativo"),
      v.literal("inativo"),
      v.literal("inadimplente")
    ),
    joinedAt: v.optional(v.string()),    // data de adesão (ISO)
    leftAt: v.optional(v.string()),      // data de desligamento (ISO)
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_unit", ["unit"])
    .index("by_name", ["name"])
    .index("by_cpf_prefix", ["cpfPrefix"]),

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

  suppliers: defineTable({
    name: v.string(),
    category: v.string(),
    cnpj: v.optional(v.string()),
    contact: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    contractStart: v.optional(v.string()),
    contractEnd: v.optional(v.string()),
    monthlyValue: v.optional(v.number()),
    status: v.union(v.literal("ativo"), v.literal("inativo")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_category", ["category"])
    .index("by_name", ["name"]),

  assets: defineTable({
    name: v.string(),
    category: v.string(),
    description: v.optional(v.string()),
    acquisitionDate: v.optional(v.string()),
    acquisitionValue: v.optional(v.number()),
    location: v.optional(v.string()),
    status: v.union(v.literal("ativo"), v.literal("inativo"), v.literal("manutencao")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_category", ["category"]),

  reservations: defineTable({
    area: v.string(),
    unit: v.string(),
    residentName: v.string(),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    status: v.union(v.literal("pendente"), v.literal("confirmada"), v.literal("cancelada")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_area", ["area"])
    .index("by_status", ["status"])
    .index("by_unit", ["unit"]),

  maintenances: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    area: v.optional(v.string()),
    priority: v.union(v.literal("baixa"), v.literal("media"), v.literal("alta"), v.literal("urgente")),
    status: v.union(v.literal("aberto"), v.literal("em_andamento"), v.literal("concluido"), v.literal("cancelado")),
    scheduledDate: v.optional(v.string()),
    completedDate: v.optional(v.string()),
    cost: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_priority", ["priority"]),

  visitors: defineTable({
    name: v.string(),
    document: v.optional(v.string()),
    unit: v.string(),
    residentName: v.optional(v.string()),
    date: v.string(),
    entryTime: v.string(),
    exitTime: v.optional(v.string()),
    purpose: v.optional(v.string()),
    vehicle: v.optional(v.string()),
    status: v.union(v.literal("presente"), v.literal("saiu")),
    createdAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_unit", ["unit"])
    .index("by_status", ["status"]),
});
