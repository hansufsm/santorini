/**
 * schema.ts — Definição completa das tabelas do sistema Santorini
 *
 * Hierarquia de papéis (users):
 *   sysadmin > diretoria > associado > morador
 *
 * Política de exclusão:
 *   Nenhum dado é deletado permanentemente. Todos os registros
 *   sensíveis têm campo "deletedAt" para soft delete.
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

  // ─── Transações financeiras ───────────────────────────────────────────────
  // Importadas do InfinitePay via CSV. Deduplicação por transactionKey.

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

  // ─── Associados (titulares financeiros da unidade) ────────────────────────
  // Cada associado pode ter vários Moradores vinculados na tabela users.

  associates: defineTable({
    name: v.string(),
    unit: v.optional(v.string()),       // opcional — CSV de associados pode não ter unidade
    cpf: v.optional(v.string()),         // CPF completo (só admin vê)
    cpfPrefix: v.optional(v.string()),   // primeiros dígitos — usado no portal público
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    status: v.union(
      v.literal("ativo"),
      v.literal("inativo"),
      v.literal("inadimplente")
    ),
    joinedAt: v.optional(v.string()),   // data de adesão (formato ISO: YYYY-MM-DD)
    leftAt: v.optional(v.string()),     // data de desligamento (formato ISO)
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),  // soft delete
  })
    .index("by_status", ["status"])
    .index("by_unit", ["unit"])
    .index("by_name", ["name"])
    .index("by_cpf_prefix", ["cpfPrefix"]),

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
    deletedAt: v.optional(v.number()),  // soft delete
  })
    .index("by_active", ["active"])
    .index("by_type", ["type"]),

  // ─── Documentos ───────────────────────────────────────────────────────────

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

  // ─── Assembleias ──────────────────────────────────────────────────────────

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

  // ─── Votações (vinculadas a assembleias) ──────────────────────────────────

  votes: defineTable({
    assemblyId: v.id("assemblies"),
    title: v.string(),
    options: v.array(v.object({ label: v.string(), count: v.number() })),
    result: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_assembly", ["assemblyId"]),

  // ─── Fornecedores ─────────────────────────────────────────────────────────

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

  // ─── Patrimônio ───────────────────────────────────────────────────────────

  assets: defineTable({
    name: v.string(),
    category: v.string(),
    description: v.optional(v.string()),
    acquisitionDate: v.optional(v.string()),
    acquisitionValue: v.optional(v.number()),
    location: v.optional(v.string()),
    status: v.union(
      v.literal("ativo"),
      v.literal("inativo"),
      v.literal("manutencao")
    ),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_category", ["category"]),

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
    deletedAt: v.optional(v.number()),  // soft delete
  })
    .index("by_date", ["date"])
    .index("by_area", ["area"])
    .index("by_status", ["status"])
    .index("by_unit", ["unit"]),

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
    scheduledDate: v.optional(v.string()),  // data prevista para execução
    completedDate: v.optional(v.string()),  // data de conclusão real
    cost: v.optional(v.number()),           // custo do serviço
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),      // soft delete
  })
    .index("by_status", ["status"])
    .index("by_priority", ["priority"]),

  // ─── Controle de visitantes ───────────────────────────────────────────────

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

  // ─── Usuários do sistema (RBAC) ───────────────────────────────────────────
  //
  // Hierarquia de papéis:
  //   sysadmin  — máximo 2 ativos; imutável por outros papéis
  //   diretoria — gerencia documentos, comunicados, usuários (exceto sysadmin)
  //   associado — titular financeiro; acessa histórico próprio no portal
  //   morador   — familiar/inquilino; acessa portal mas sem histórico financeiro

  users: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    passwordHash: v.optional(v.string()),       // SHA-256 hex — obrigatório para diretoria/sysadmin
    role: v.union(
      v.literal("sysadmin"),
      v.literal("diretoria"),
      v.literal("associado"),
      v.literal("morador")
    ),
    // Opcional para aceitar registros legados criados antes da migração de status.
    status: v.optional(v.union(v.literal("ativo"), v.literal("inativo"))),
    active: v.optional(v.boolean()),                    // legado: active=true equivale a status="ativo"
    associateId: v.optional(v.id("associates")),        // link ao registro financeiro (Associado)
    parentAssociateId: v.optional(v.id("associates")), // link ao titular da unidade (Morador)
    unit: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),          // soft delete — nunca excluir de verdade
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_status", ["status"])
    .index("by_associate", ["associateId"])
    .index("by_parent_associate", ["parentAssociateId"]),

  // ─── Sessões autenticadas ─────────────────────────────────────────────────
  //
  // Token gerado no login, armazenado pelo cliente (sessionStorage ou cookie).
  // Sessões expiram automaticamente após 8 horas.
  // Sessões são os únicos registros que podem ser deletados de verdade (no logout).

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),       // 64 caracteres hex gerados aleatoriamente
    createdAt: v.number(),
    expiresAt: v.number(),   // createdAt + 8 horas
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),
});
