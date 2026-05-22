# 🔌 API Backend — Referência Convex

Todas as funções são chamadas via HTTP POST para `https://tough-kangaroo-90.convex.cloud/api/`.

```
POST /api/query    → leitura (sem efeitos colaterais)
POST /api/mutation → escrita (insere, atualiza, deleta)
```

**Corpo da requisição:**
```json
{ "path": "modulo:nomeDaFuncao", "args": { ... } }
```

**Resposta (sempre HTTP 200):**
```json
{ "status": "success", "value": <resultado> }
{ "status": "error",   "errorMessage": "..." }
```

> ⚠️ O Convex retorna HTTP 200 mesmo para erros de aplicação. Sempre verificar `data.status`.

---

## transactions.ts

### `transactions:importTransactions` `mutation`

Importa lote de transações com upsert por chave de deduplicação.

```typescript
args: {
  transactions: Array<{
    date: string           // "yyyy-mm-dd"
    time: string           // "hh:mm:ss"
    type: string           // ex: "Pix"
    name: string           // nome do pagador/recebedor
    detail: string         // "Recebido" | "Enviado"
    value: number          // positivo = crédito, negativo = débito
    originalValue: string  // string original do CSV
    transactionKey: string // chave de dedup: "date|time|value|detail"
  }>
}
returns: { inserted: number, updated: number, skipped: number, total: number }
```

**Deduplicação:** `transactionKey` igual + nome/tipo diferente → `patch`. Igual → `skip`. Novo → `insert`.

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
returns: Transaction[]
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

Resumo financeiro consolidado (todos os períodos).

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
args: { months?: number }  // se definido: últimos N meses
returns: Array<{ month: string, received: number, sent: number }>
```

---

### `transactions:getAssociateHistory` `query`

Histórico de contribuições de um associado (busca por substring do nome).

```typescript
args: { search: string }
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

Associados ativos sem pagamento no mês especificado.

```typescript
args: { monthKey: string }  // "yyyy-mm"
returns: Array<{
  id: Id<"associates">
  name: string
  unit?: string
  status: "ativo" | "inativo" | "inadimplente"
  lastPaymentDate: string | null
}>
```

---

## associates.ts

### `associates:importAssociates` `mutation`

Import em lote com upsert — carrega toda a tabela uma vez e usa Maps em memória (O(n), sem N+1).

> ⚠️ Esta versão corrigida ainda não está em produção — requer `npx convex deploy`.  
> O frontend usa `createAssociate`/`updateAssociate` individualmente como alternativa compatível.

```typescript
args: {
  associates: Array<{
    name: string
    unit?: string
    cpf?: string        // somente dígitos
    cpfPrefix?: string  // 5 primeiros dígitos
    email?: string
    phone?: string
    joinedAt?: string   // "yyyy-mm-dd"
    leftAt?: string     // "yyyy-mm-dd"
    notes?: string
    status: "ativo" | "inativo" | "inadimplente"
  }>
}
returns: { inserted: number, updated: number, total: number }
```

---

### `associates:clearAllAssociates` `mutation` ⚠️ requer deploy

Apaga TODOS os associados. Use antes de reimportar CSV com dados corrigidos.

```typescript
args: {}
returns: { deleted: number }
```

---

### `associates:createAssociate` `mutation`

Cria um único associado. Disponível em todas as versões de produção.

```typescript
args: {
  name: string
  unit: string          // obrigatório; use '' se não houver unidade
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

Atualiza campos de um associado existente (todos opcionais).

```typescript
args: {
  id: Id<"associates">  // obrigatório
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

Retorna todos os associados ordenados por nome (pt-BR).

> ⚠️ Versão em produção ordena por `unit` (quebra se unit for undefined). Deploy necessário para a versão corrigida.  
> O frontend usa `try/catch` como fallback se esta query falhar.

```typescript
args: {}
returns: Associate[]
```

---

### `associates:getAssociatesByStatus` `query`

Filtra por status usando índice `by_status`.

```typescript
args: { status: "ativo" | "inativo" | "inadimplente" }
returns: Associate[]
```

---

### `associates:searchAssociate` `query`

Busca por substring de nome, prefixo de CPF (5 dígitos) ou unidade.

```typescript
args: { search: string }
returns: Associate[]
```

---

### `associates:getAssociatesSummary` `query`

Contagem de associados por status.

```typescript
args: {}
returns: { total: number, ativos: number, inativos: number, inadimplentes: number }
```

---

## users.ts

### `users:getUserByEmail` `query`

Busca usuário por e-mail (usado na autenticação).

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
  passwordHash: string  // SHA-256 hex (calculado no browser)
  role: "sysadmin" | "admin" | "viewer"
}
returns: Id<"users">
```

---

### `users:getAllUsers` `query`

Lista todos os usuários (verificação de permissão feita no frontend).

```typescript
args: {}
returns: User[]
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

Remove um usuário permanentemente.

```typescript
args: { id: Id<"users"> }
returns: void
```

---

## Demais módulos (padrão CRUD)

Os módulos abaixo seguem o padrão `create*`, `update*`, `delete*`, `getAll*`, `get*ById`.  
Consulte o código-fonte em `convex/` para assinaturas detalhadas.

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

---

## Legenda de estado das funções

| Ícone | Significado |
|-------|------------|
| (sem ícone) | Em produção e funcionando |
| ⚠️ requer deploy | Código local pronto; `npx convex deploy` pendente |
| ❌ descontinuada | Não usar — manter por compatibilidade |
