# 🗄️ Schema do Banco de Dados — Convex

Projeto: `tough-kangaroo-90`  
Arquivo: `convex/schema.ts`

---

## Tabela: `transactions`

Histórico financeiro importado do InfinitePay (CSV).

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `_id` | `Id<"transactions">` | auto | ID único gerado pelo Convex |
| `_creationTime` | `number` | auto | Timestamp de criação (ms) |
| `date` | `string` | ✅ | Data no formato `yyyy-mm-dd` |
| `time` | `string` | ✅ | Hora no formato `hh:mm:ss` |
| `type` | `string` | ✅ | Tipo da transação (ex: "Pix") |
| `name` | `string` | ✅ | Nome do pagador/recebedor |
| `detail` | `string` | ✅ | "Recebido" ou "Enviado" |
| `value` | `number` | ✅ | Valor em reais (positivo = crédito, negativo = débito) |
| `originalValue` | `string` | ✅ | String original do CSV |
| `transactionKey` | `string` | ✅ | Chave de deduplicação: `date|time|value|detail` |
| `importedAt` | `number` | ✅ | Timestamp do import (ms) |

**Índices:**
```
by_date          → ["date"]
by_key           → ["transactionKey"]
by_detail        → ["detail"]
by_date_detail   → ["date", "detail"]
```

---

## Tabela: `associates`

Cadastro de associados do residencial.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `_id` | `Id<"associates">` | auto | ID único |
| `name` | `string` | ✅ | Nome completo |
| `unit` | `string?` | — | Número da unidade/apartamento |
| `cpf` | `string?` | — | CPF completo (somente dígitos) — acesso admin |
| `cpfPrefix` | `string?` | — | 5 primeiros dígitos do CPF — portal público |
| `phone` | `string?` | — | Telefone |
| `email` | `string?` | — | E-mail |
| `status` | `"ativo" \| "inativo" \| "inadimplente"` | ✅ | Status atual |
| `joinedAt` | `string?` | — | Data de adesão `yyyy-mm-dd` |
| `leftAt` | `string?` | — | Data de desligamento `yyyy-mm-dd` |
| `notes` | `string?` | — | Observações livres |
| `createdAt` | `number` | ✅ | Timestamp de criação (ms) |
| `updatedAt` | `number` | ✅ | Timestamp da última atualização (ms) |

**Índices:**
```
by_status     → ["status"]
by_unit       → ["unit"]
by_name       → ["name"]
by_cpf_prefix → ["cpfPrefix"]
```

---

## Tabela: `announcements`

Comunicados e mural de avisos.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `title` | `string` | ✅ | Título do comunicado |
| `content` | `string` | ✅ | Corpo do comunicado (texto livre) |
| `type` | `"info" \| "urgente" \| "manutencao" \| "evento"` | ✅ | Categoria |
| `active` | `boolean` | ✅ | Se `false`, não aparece para o público |
| `createdAt` | `number` | ✅ | ms |
| `updatedAt` | `number` | ✅ | ms |

**Índices:** `by_active → ["active"]`, `by_type → ["type"]`

---

## Tabela: `documents`

Documentos e atas (links externos).

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `title` | `string` | ✅ | Nome do documento |
| `description` | `string?` | — | Descrição breve |
| `category` | `"ata" \| "regulamento" \| "contrato" \| "outro"` | ✅ | Categoria |
| `fileUrl` | `string` | ✅ | URL externa (Google Drive, Dropbox, etc.) |
| `date` | `string` | ✅ | Data do documento `yyyy-mm-dd` |
| `createdAt` | `number` | ✅ | ms |

**Índices:** `by_category → ["category"]`, `by_date → ["date"]`

---

## Tabela: `assemblies`

Assembleias ordinárias e extraordinárias.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `date` | `string` | ✅ | Data `yyyy-mm-dd` |
| `type` | `"ordinaria" \| "extraordinaria"` | ✅ | Tipo |
| `location` | `string?` | — | Local |
| `agenda` | `string` | ✅ | Pauta |
| `minutes` | `string?` | — | Ata resumida |
| `attendees` | `number?` | — | Número de presentes |
| `status` | `"agendada" \| "realizada" \| "cancelada"` | ✅ | Status |
| `createdAt` | `number` | ✅ | ms |
| `updatedAt` | `number` | ✅ | ms |

**Índices:** `by_date → ["date"]`, `by_status → ["status"]`

---

## Tabela: `votes`

Votações aninhadas a uma assembleia.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `assemblyId` | `Id<"assemblies">` | ✅ | FK para assembleia |
| `title` | `string` | ✅ | Título da votação |
| `options` | `Array<{ label: string, count: number }>` | ✅ | Opções com contagem |
| `result` | `string?` | — | Resultado final textual |
| `createdAt` | `number` | ✅ | ms |

**Índices:** `by_assembly → ["assemblyId"]`

---

## Tabela: `users`

Usuários do painel administrativo.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | `string` | ✅ | Nome de exibição |
| `email` | `string` | ✅ | E-mail (único — usado como login) |
| `passwordHash` | `string` | ✅ | SHA-256 hex da senha |
| `role` | `"sysadmin" \| "admin" \| "viewer"` | ✅ | Nível de acesso |
| `active` | `boolean` | ✅ | Conta habilitada |
| `createdAt` | `number` | ✅ | ms |
| `updatedAt` | `number` | ✅ | ms |

**Índices:** `by_email → ["email"]`, `by_role → ["role"]`

---

## Tabela: `suppliers`

Fornecedores e prestadores de serviço.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | `string` | ✅ | Razão social ou nome |
| `category` | `string` | ✅ | Ex: "Limpeza", "Segurança", "TI" |
| `cnpj` | `string?` | — | CNPJ |
| `contact` | `string?` | — | Nome do contato |
| `phone` | `string?` | — | Telefone |
| `email` | `string?` | — | E-mail |
| `contractStart` | `string?` | — | Início do contrato `yyyy-mm-dd` |
| `contractEnd` | `string?` | — | Fim do contrato `yyyy-mm-dd` |
| `monthlyValue` | `number?` | — | Valor mensal em reais |
| `status` | `"ativo" \| "inativo"` | ✅ | Status |
| `notes` | `string?` | — | Observações |
| `createdAt` | `number` | ✅ | ms |
| `updatedAt` | `number` | ✅ | ms |

**Índices:** `by_status`, `by_category`, `by_name`

---

## Tabela: `assets`

Patrimônio / inventário de bens.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | `string` | ✅ | Nome do bem |
| `category` | `string` | ✅ | Ex: "Equipamento", "Mobiliário" |
| `description` | `string?` | — | Descrição |
| `acquisitionDate` | `string?` | — | Data de aquisição `yyyy-mm-dd` |
| `acquisitionValue` | `number?` | — | Valor de aquisição |
| `location` | `string?` | — | Localização física |
| `status` | `"ativo" \| "inativo" \| "manutencao"` | ✅ | Estado |
| `notes` | `string?` | — | Observações |
| `createdAt` | `number` | ✅ | ms |
| `updatedAt` | `number` | ✅ | ms |

**Índices:** `by_status`, `by_category`

---

## Tabela: `reservations`

Agendamento de áreas comuns.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `area` | `string` | ✅ | Ex: "Salão de Festas", "Churrasqueira" |
| `unit` | `string` | ✅ | Unidade do morador |
| `residentName` | `string` | ✅ | Nome do responsável |
| `date` | `string` | ✅ | Data `yyyy-mm-dd` |
| `startTime` | `string` | ✅ | Hora de início `hh:mm` |
| `endTime` | `string` | ✅ | Hora de término `hh:mm` |
| `status` | `"pendente" \| "confirmada" \| "cancelada"` | ✅ | Status |
| `notes` | `string?` | — | Observações |
| `createdAt` | `number` | ✅ | ms |
| `updatedAt` | `number` | ✅ | ms |

**Índices:** `by_date`, `by_area`, `by_status`, `by_unit`

---

## Tabela: `maintenances`

Chamados de manutenção.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `title` | `string` | ✅ | Título do chamado |
| `description` | `string?` | — | Descrição detalhada |
| `area` | `string?` | — | Área do residencial |
| `priority` | `"baixa" \| "media" \| "alta" \| "urgente"` | ✅ | Prioridade |
| `status` | `"aberto" \| "em_andamento" \| "concluido" \| "cancelado"` | ✅ | Status |
| `scheduledDate` | `string?` | — | Data agendada `yyyy-mm-dd` |
| `completedDate` | `string?` | — | Data de conclusão `yyyy-mm-dd` |
| `cost` | `number?` | — | Custo em reais |
| `notes` | `string?` | — | Observações |
| `createdAt` | `number` | ✅ | ms |
| `updatedAt` | `number` | ✅ | ms |

**Índices:** `by_status`, `by_priority`

---

## Tabela: `visitors`

Registro de acesso de visitantes.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | `string` | ✅ | Nome do visitante |
| `document` | `string?` | — | CPF, RG ou outro documento |
| `unit` | `string` | ✅ | Unidade visitada |
| `residentName` | `string?` | — | Nome do morador responsável |
| `date` | `string` | ✅ | Data `yyyy-mm-dd` |
| `entryTime` | `string` | ✅ | Hora de entrada `hh:mm` |
| `exitTime` | `string?` | — | Hora de saída `hh:mm` (vazio = ainda presente) |
| `purpose` | `string?` | — | Finalidade da visita |
| `vehicle` | `string?` | — | Placa do veículo |
| `status` | `"presente" \| "saiu"` | ✅ | Status atual |
| `createdAt` | `number` | ✅ | ms |

**Índices:** `by_date`, `by_unit`, `by_status`

---

## Diagrama de relacionamentos

```
assemblies ──< votes         (1 assembleia → N votações)
associates                   (independente — cruzado com transactions no frontend)
transactions                 (independente)
users                        (independente)
announcements                (independente)
documents                    (independente)
suppliers                    (independente)
assets                       (independente)
reservations                 (independente)
maintenances                 (independente)
visitors                     (independente)
```

> Convex não tem JOINs nativos. Relacionamentos são resolvidos no handler TypeScript ou no frontend.
