# 🔌 API Backend — Referência Convex

Todas as funções são chamadas via HTTP POST para `https://tough-kangaroo-90.convex.cloud/api/`.

```
POST /api/query    → para queries (leitura)
POST /api/mutation → para mutations (escrita)
```

**Corpo da requisição:**
```json
{ "path": "modulo:nomeDaFuncao", "args": { ... } }
```

**Resposta (sempre HTTP 200):**
```json
{ "status": "success", "value": <resultado> }
{ "status": "error", "errorMessage": "..." }
```

---

## transactions.ts

### `transactions:importTransactions` `mutation`

Importa lote de transações com upsert por chave.

```typescript
args: {
  transactions: Array<{
    date: string           // "yyyy-mm-dd"
    time: string           // "hh:mm:ss"
    type: string           // "Recebido" | "Enviado" | ...
    name: string           // nome do pagador/recebedor
    detail: string         // "Recebido" | "Enviado"
    value: number          // positivo = crédito, negativo = débito
    originalValue: string  // string original do CSV
    transactionKey: string // chave de dedup: "date|time|value|detail"
  }>
}
returns: { inserted: number, updated: number, skipped: number, total: number }
```

**Deduplicação:** se `transactionKey` já existe e nome/tipo difere → `patch`. Se igual → `skip`. Se não existe → `insert`.

---

### `transactions:clearAllTransactions` `mutation`

Apaga TODAS as transações. Use antes de reimportar CSV com dados corrigidos.

```typescript
args: {}
returns: { deleted: number }
```

---

### `transactions:getAllTransactions` `query`

Retorna todas as transações ordenadas por data decrescente.

```typescript
args: {}
returns: Transaction[]  // ordenado: mais recente primeiro
```

---

### `transactions:getAvailableMonths` `query`

Lista os meses com transações registradas.

```typescript
args: {}
returns: string[]  // ["2026-05", "2026-04", ...] — decrescente
```

---

### `transactions:getSummary` `query`

Resumo financeiro geral (todos os períodos).

```typescript
args: {}
returns: {
  totalReceived: number
  totalSent: number
  netBalance: number
  contributorsCount: number
  receivedCount: number
  sentCount: number
  totalTransactions: number
}
```

---

### `transactions:getTopContributors` `query`

Ranking de maiores contribuintes por valor acumulado.

```typescript
args: { limit?: number }  // padrão: 5
returns: Array<{ name: string, total: number }>
```

---

### `transactions:getMonthlyFlow` `query`

Fluxo mensal de entradas e saídas.

```typescript
args: { months?: number }  // se definido, retorna os N últimos meses
returns: Array<{ month: string, received: number, sent: number }>
```

---

### `transactions:getAssociateHistory` `query`

Histórico de contribuições de um associado específico.

```typescript
args: { search: string }  // substring do nome (case-insensitive)
returns: {
  name: string
  total: number
  monthsActive: number
  lastDate: string
  transactions: Transaction[]
} | null
```

---

### `transactions:getDefaulters` `query`

Lista de associados ativos sem pagamento no mês especificado.

```typescript
args: { monthKey: string }  // "yyyy-mm"
returns: Array<{
  id: Id<"associates">
  name: string
  unit: string | undefined
  status: "ativo" | "inativo" | "inadimplente"
  lastPaymentDate: string | null
}>
```

---

## associates.ts

### `associates:importAssociates` `mutation`

Importação em lote com upsert por CPF (preferencial) ou nome.

```typescript
args: {
  associates: Array<{
    name: string
    unit?: string
    cpf?: string           // CPF completo (somente números)
    cpfPrefix?: string     // 5 primeiros dígitos
    email?: string
    phone?: string
    joinedAt?: string      // "yyyy-mm-dd"
    leftAt?: string        // "yyyy-mm-dd" — se presente: status = inativo
    notes?: string
    status: "ativo" | "inativo" | "inadimplente"
  }>
}
returns: { inserted: number, updated: number, total: number }
```

**Algoritmo (O(n) — sem N+1):** carrega todos os registros existentes uma vez → monta `Map(cpf→registro)` e `Map(nome→registro)` → para cada item do lote, busca no Map → patch se encontrado, insert se não encontrado.

---

### `associates:createAssociate` `mutation`

Cria um único associado.

```typescript
args: {
  name: string
  unit: string
  cpf?: string
  cpfPrefix?: string
  phone?: string
  email?: string
  status: "ativo" | "inativo" | "inadimplente"
  joinedAt?: string
  notes?: string
}
returns: Id<"associates">
```

---

### `associates:updateAssociate` `mutation`

Atualiza campos de um associado existente.

```typescript
args: {
  id: Id<"associates">
  name?: string
  unit?: string
  cpf?: string
  cpfPrefix?: string
  phone?: string
  email?: string
  status?: "ativo" | "inativo" | "inadimplente"
  joinedAt?: string
  notes?: string
}
returns: void
```

---

### `associates:updateAssociateStatus` `mutation`

Atalho para atualizar apenas o status.

```typescript
args: {
  id: Id<"associates">
  status: "ativo" | "inativo" | "inadimplente"
}
returns: void
```

---

### `associates:getAllAssociates` `query`

Retorna todos os associados, ordenados por nome (pt-BR collation).

```typescript
args: {}
returns: Associate[]
```

---

### `associates:getAssociatesByStatus` `query`

Filtra associados por status (usa índice `by_status`).

```typescript
args: { status: "ativo" | "inativo" | "inadimplente" }
returns: Associate[]
```

---

### `associates:searchAssociate` `query`

Busca por substring de nome, prefixo de CPF ou unidade.

```typescript
args: { search: string }
returns: Associate[]
```

---

### `associates:getAssociatesSummary` `query`

Contagem por status.

```typescript
args: {}
returns: { total: number, ativos: number, inativos: number, inadimplentes: number }
```

---

## users.ts

### `users:getUserByEmail` `query`

Busca usuário por e-mail (para autenticação).

```typescript
args: { email: string }
returns: User | null
```

---

### `users:createUser` `mutation`

Cria novo usuário admin.

```typescript
args: {
  name: string
  email: string
  passwordHash: string  // SHA-256 hex calculado no browser
  role: "sysadmin" | "admin" | "viewer"
}
returns: Id<"users">
```

---

### `users:getAllUsers` `query`

Lista todos os usuários (sysadmin only — verificação no frontend).

```typescript
args: {}
returns: User[]  // passwordHash omitido no retorno
```

---

### `users:updateUser` `mutation`

Atualiza dados de um usuário.

```typescript
args: {
  id: Id<"users">
  name?: string
  email?: string
  passwordHash?: string
  role?: "sysadmin" | "admin" | "viewer"
  active?: boolean
}
returns: void
```

---

### `users:deleteUser` `mutation`

Remove um usuário.

```typescript
args: { id: Id<"users"> }
returns: void
```

---

## Demais módulos

Os módulos abaixo seguem o padrão CRUD idêntico: `create*`, `update*`, `delete*`, `getAll*`, `get*ById`.

| Módulo | Arquivo | Entidade |
|--------|---------|---------|
| Comunicados | `announcements.ts` | `announcements` |
| Documentos | `documents.ts` | `documents` |
| Assembleias | `assemblies.ts` | `assemblies` + `votes` |
| Fornecedores | `suppliers.ts` | `suppliers` |
| Patrimônio | `assets.ts` | `assets` |
| Reservas | `reservations.ts` | `reservations` |
| Manutenção | `maintenances.ts` | `maintenances` |
| Visitantes | `visitors.ts` | `visitors` |

Consulte o código-fonte de cada arquivo em `convex/` para a assinatura exata de cada função.

---

## Códigos de erro comuns

| Mensagem | Causa | Solução |
|---------|-------|---------|
| `Server Error` (sem detalhe) | Schema validation failure | Verificar campos obrigatórios; fazer deploy do Convex atualizado |
| `Timeout: ... não respondeu em Xs` | Convex offline ou deploy não realizado | Rodar `npx convex deploy` |
| `Convex mutation error (path): ...` | Erro HTTP (não 2xx) | Verificar URL do Convex em `script.js` |
| `Nenhum associado válido encontrado` | CSV vazio ou sem coluna "Nome" | Verificar formato do CSV |
