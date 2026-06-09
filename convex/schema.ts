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

  // ─── Arquivos CSV processados do pCloud ───────────────────────────────────
  // Controle idempotente da sincronização por API autenticada ou pasta pública.

  pcloudImportFiles: defineTable({
    fileKey: v.string(),
    fileId: v.optional(v.string()),
    fileName: v.string(),
    fileHash: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    modified: v.optional(v.string()),
    sourceUrl: v.string(),
    rowsImported: v.number(),
    inserted: v.number(),
    updated: v.number(),
    skipped: v.number(),
    status: v.union(v.literal("processed"), v.literal("failed")),
    error: v.optional(v.string()),
    importedAt: v.number(),
  })
    .index("by_file_key", ["fileKey"])
    .index("by_imported_at", ["importedAt"]),

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
    // Nomes alternativos que aparecem no extrato bancário para esta unidade.
    // Ex: ["Amilton Silva", "Macpela dos Santos"] — contribuições de qualquer
    // desses nomes são contabilizadas como pertencentes a este associado.
    payerNames: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),  // soft delete
  })
    .index("by_status", ["status"])
    .index("by_unit", ["unit"])
    .index("by_name", ["name"])
    .index("by_cpf_prefix", ["cpfPrefix"]),

  // ─── Auditoria de ações da Diretoria ──────────────────────────────────────
  // Registros operacionais consultáveis apenas pelo Sysadmin.

  boardActionLogs: defineTable({
    actorUserId: v.id("users"),
    actorName: v.string(),
    actorRole: v.union(v.literal("diretoria"), v.literal("sysadmin")),
    action: v.string(),
    entity: v.string(),
    entityId: v.string(),
    entityLabel: v.optional(v.string()),
    summary: v.string(),
    before: v.optional(v.string()),
    after: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_actor", ["actorUserId"])
    .index("by_entity", ["entity", "entityId"])
    .index("by_created_at", ["createdAt"]),

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
    targetRoles: v.optional(v.array(v.union(
      v.literal("morador"),
      v.literal("associado"),
      v.literal("diretoria"),
      v.literal("sysadmin")
    ))),
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

  // ─── Feedback Comunitário ─────────────────────────────────────────────────
  // Registros enviados por moradores, associados, diretoria ou visitantes.
  // A tabela já nasce com associationId para evolução SaaS multiassociação.

  feedbacks: defineTable({
    associationId: v.string(),
    category: v.union(
      v.literal("sugestao"),
      v.literal("problema"),
      v.literal("elogio"),
      v.literal("duvida"),
      v.literal("outro")
    ),
    message: v.string(),
    url: v.string(),
    route: v.string(),
    userRole: v.optional(
      v.union(
        v.literal("sysadmin"),
        v.literal("diretoria"),
        v.literal("associado"),
        v.literal("morador")
      )
    ),
    userId: v.optional(v.id("users")),
    status: v.union(
      v.literal("novo"),
      v.literal("em_analise"),
      v.literal("resolvido"),
      v.literal("arquivado")
    ),
    screenshotUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_association", ["associationId"])
    .index("by_association_status", ["associationId", "status"])
    .index("by_status", ["status"])
    .index("by_category", ["category"])
    .index("by_created_at", ["createdAt"]),

  // ─── Trilha Viva Santorini ─────────────────────────────────────────────────
  // Progresso individual dos microtutoriais por usuário, rota e papel.
  // A associação padrão mantém a evolução SaaS sem acoplar a versão atual.

  trilhaVivaProgress: defineTable({
    associationId: v.string(),
    guideId: v.string(),
    route: v.string(),
    menuLabel: v.string(),
    userId: v.id("users"),
    userRole: v.union(
      v.literal("sysadmin"),
      v.literal("diretoria"),
      v.literal("associado"),
      v.literal("morador")
    ),
    status: v.union(
      v.literal("nao_iniciado"),
      v.literal("em_andamento"),
      v.literal("concluido"),
      v.literal("reiniciado")
    ),
    completedAt: v.optional(v.number()),
    lastOpenedAt: v.optional(v.number()),
    restartedAt: v.optional(v.number()),
    completionCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_user_guide", ["userId", "guideId"])
    .index("by_user", ["userId"])
    .index("by_association", ["associationId"])
    .index("by_association_route", ["associationId", "route"])
    .index("by_association_status", ["associationId", "status"])
    .index("by_role", ["userRole"])
    .index("by_updated_at", ["updatedAt"]),

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
    telegramChatId: v.optional(v.string()),
    telegramVerificationCode: v.optional(v.string()),
    telegramLinkedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_status", ["status"])
    .index("by_associate", ["associateId"])
    .index("by_parent_associate", ["parentAssociateId"])
    .index("by_unit", ["unit"])
    .index("by_telegram_chat", ["telegramChatId"])
    .index("by_telegram_code", ["telegramVerificationCode"]),

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

  // ─── Configurações globais e Feature Flags ─────────────────────────────────
  systemSettings: defineTable({
    key: v.string(),
    label: v.string(),
    description: v.string(),
    enabled: v.boolean(),
    category: v.union(v.literal("modulo"), v.literal("sistema"), v.literal("integracao")),
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_key", ["key"])
    .index("by_category", ["category"]),

  // ─── Logs de segurança e bloqueios ─────────────────────────────────────────
  securityLogs: defineTable({
    ip: v.string(),
    timestamp: v.number(),
    details: v.string(),
  })
    .index("by_timestamp", ["timestamp"]),
});
