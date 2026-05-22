# CHANGELOG — AMRTS Santorini Dashboard

Registro cronológico do desenvolvimento do projeto.  
Cada entrada contém: versão (hash git), timestamp e descrição das mudanças.

---

## [66392b6] — 2026-05-22 (Sessão 4)
**fix: getAllAssociates com fallback seguro + clearAllAssociates + botão Limpar Associados**

### Causa raiz identificada e corrigida
- `getAllAssociates` em produção ordena por `a.unit.localeCompare(b.unit)`; registros
  com `unit: undefined` (inseridos por tentativas anteriores sem o campo) causavam
  `TypeError` → Server Error antes de qualquer import iniciar
- Solução: `getAllAssociates` envolto em `try/catch` no frontend; se falhar, import
  continua sem deduplicação e exibe aviso amarelo

### Nova mutation Convex
- `associates:clearAllAssociates` — apaga todo o cadastro de associados
  (análogo ao `clearAllTransactions` existente para transações)

### UI
- Botão **Limpar associados** adicionado ao drawer admin (laranja, com confirmação)
- Funciona após `npx convex deploy`

---

## [9416989] — 2026-05-22 (Sessão 4)
**fix: import associados sem importAssociates — usa create/update individuais**

### Problema
- `importAssociates` em produção tem bug N+1: faz varredura completa da tabela
  para cada associado do lote → timeout com lotes de 50 registros → Server Error

### Solução (sem depender de deploy Convex)
- Import reescrito para rodar inteiramente no frontend:
  1. `getAllAssociates` carrega todos os registros existentes uma vez
  2. Frontend monta `Map(cpf→registro)` e `Map(nome→registro)`
  3. Para cada linha do CSV: `updateAssociate` se encontrado, `createAssociate` se novo
- `createAssociate` usa `unit: ''` (campo obrigatório em versões antigas do schema)
- Data de desligamento (`leftAt`) armazenada em `notes` até deploy atualizar o schema
- Toast de progresso a cada 5 registros; erros por linha capturados individualmente

---

## [2dcb940] — 2026-05-22 (Sessão 4)
**fix: forceCloseAll() fecha drawer/modais em qualquer erro + Escape key global**

### Problema
- Erros durante o import enquanto o drawer estava aberto deixavam o backdrop
  visível e `overflow:hidden` ativo → botões da navbar não respondiam a cliques

### Solução
- `forceCloseAll()`: fecha drawer + todos os `[id$="-modal"]` + reseta overflow;
  chamada automaticamente em qualquer `showConvexError()`
- Handler global `keydown` para `Escape`: fecha modal aberto ou drawer

---

## [e7b351a] — 2026-05-22 (Sessão 3 — tarde)
**fix: importAssociates aceita unit/notes/leftAt como opcionais nos args**

### Problema corrigido
- `importAssociates` rejeitava chamadas com campos `leftAt` e `notes` por não
  estarem declarados nos `args` da mutation → Server Error ao importar CSV
- Adicionados `unit`, `notes` e confirmado `leftAt` como `v.optional` nos args

### Pendente (requer ação manual)
- **Executar `npx convex deploy --typecheck disable`** para publicar as
  correções acumuladas do Convex (schema `unit` opcional, Map-based import,
  campos extras nos args). Sem o deploy, o import de associados continua falhando.

---

## [ca704c2] — 2026-05-22 (Sessão 3 — manhã)
**fix: travamento de menus + limpeza da top bar**

### Correções de UX
- `showConvexError` agora sempre reseta `document.body.style.overflow = ''`
  → menus voltam a funcionar após erro de servidor
- Removido botão "Importar CSV" da top bar desktop (mantido só no drawer admin)
- Removido link "Documentação" da top bar desktop (mantido só no drawer)
- `csv-file-input` movido para fora do `admin-controls` (acessível pelo drawer)
- Handler direto adicionado para `import-csv-btn-mob` (o botão delegado foi removido)

---

## [a6f619f] — 2026-05-22 (Sessão 3 — manhã)
**feat: portal busca por 5 dígitos do CPF + fix importAssociates**

### Portal do Associado
- Campo de busca aceita os **5 primeiros dígitos do CPF** como identificador
- `inputmode="numeric" maxlength="5" pattern="[0-9]{5}"` (teclado numérico no mobile)
- Frontend filtra `associates` por `cpfPrefix.startsWith(prefixo)` antes de
  cruzar com o histórico de transações

### Backend — importAssociates
- Corrigido bug N+1: substituída query-dentro-de-loop por varredura única +
  `Map` em memória (`byCpf` e `byName`) → O(n) em vez de O(n²)
- `getAllAssociates` corrigido: ordenação por `name` (era por `unit`, que agora
  é opcional e quebrava o sort)
- `searchAssociate` corrigido: `a.unit.includes(term)` → `(a.unit && a.unit.includes(term))`

---

## [95da2c6] — 2026-05-22 (Sessão 3 — manhã)
**fix: renomeia 'Top Contribuintes' para 'Contribuintes Assíduos'**
- Card na seção financeira: "Top Contribuintes" → "Contribuintes Assíduos"
- Rótulo do gráfico de barras: "Total recebido" → "Contribuição acumulada"

---

## [e5036d3] — 2026-05-22 (Sessão 3 — manhã)
**fix: anonimização 'Associado 042' / 'Despesa 07' em vez de iniciais**

- Visitantes públicos veem **"Associado 042"** (crédito) ou **"Despesa 07"** (débito)
- Admins continuam vendo nome real
- Associado autenticado vê o próprio nome real no extrato
- ID determinístico via `_stableId(str, max)` — mesmo nome → mesmo número sempre
- Formato anterior ("Hans Z.") removido

---

## [06a1a13] — 2026-05-22 (Sessão 3 — manhã)
**fix: searchAssociate seguro com unit opcional**
- Proteção de null em `a.unit && a.unit.includes(term)` dentro do filtro de busca

---

## [18e0d78] — 2026-05-22 (Sessão 3 — manhã)
**fix: import CSV em lotes de 50 + timeout 2 min para operações longas**

- `convexMutationLong(fn, args)`: AbortController com timeout de 120 s
  (padrão era 12 s → expirava antes de importar CSVs grandes)
- Importação de transações: chunked em lotes de 50 registros por mutation
- Toast progressivo: "Importando lote X/Y…" durante o processo
- Retorna `{ inserted, updated, skipped }` acumulados de todos os lotes

---

## [71c56fb] — 2026-05-22 (Sessão 3 — manhã)
**feat: importador CSV de associados + schema atualizado**

### Backend (Convex)
- `schema.ts`:
  - `associates.unit` → `v.optional(v.string())` (era obrigatório)
  - `associates.leftAt` adicionado como `v.optional(v.string())`
  - Índice `by_cpf_prefix` adicionado
  - Novas tabelas da Fase 3: `suppliers`, `assets`, `reservations`,
    `maintenances`, `visitors`
- `associates.ts`: mutation `importAssociates` com upsert por CPF ou nome

### Frontend
- Botão "Importar Associados" no drawer admin
- Parser CSV aceita formato `Nome,CPF,E-mail,Telefone,Adesao,Desligamento`
  - Separador auto-detectado (`,` ou `;`)
  - Datas `dd/mm/yyyy` convertidas para ISO `yyyy-mm-dd`
  - `cpfPrefix` = 5 primeiros dígitos do CPF (apenas números)
  - Status derivado: `leftAt` preenchido → `"inativo"`, vazio → `"ativo"`
  - Vírgula trailing no final de cada linha: tratada corretamente

---

## [62ee3c1] — 2026-05-22 (Sessão 3 — manhã)
**feat: limpar histórico + upsert no reimport de transações**

### Backend
- `transactions.ts`: mutation `clearAllTransactions` — apaga todo o histórico
  (usado antes de reimportar CSV com nomes reais)
- `importTransactions`: upsert — se `transactionKey` já existe e nome/tipo
  difere, faz `patch`; retorna `{ inserted, updated, skipped }`
- Chave de deduplicação: `${date}|${time}|${value}|${detail}` (sem `name`,
  permite reimport com nomes corrigidos)

### Frontend
- Botão "Limpar histórico" (laranja) no drawer admin com confirmação
- Toast após limpar: "X transações removidas"
- `appState` zerado após limpeza

---

## [73e9aab] — 2026-05-22 (Sessão 3 — manhã)
**feat: anonimização de nomes para visitantes públicos**

- `maskName(name, own, value)`: admin vê real, público vê pseudônimo
- `getTransactionKey`: chave sem `name` para permitir reimport com nomes reais

---

## [0f40f19] — 2026-05-22 (Sessão 2)
**feat: Fase 3 — Fornecedores, Patrimônio, Reservas, Manutenção, Visitantes + Gestão de Usuários + UX**

### Módulos adicionados
- **Fornecedores** — CRUD com categoria, CNPJ, contato, valor mensal, vigência de contrato
- **Patrimônio** — cadastro de bens com categoria, localização, valor de aquisição, status
- **Reservas** — agendamento de áreas comuns por unidade com controle de conflito
- **Manutenção** — chamados com prioridade, área, custo, datas de execução
- **Visitantes** — registro de entrada/saída com documento, unidade e veículo
- **Gestão de Usuários** — criação e listagem de contas admin/viewer (senha SHA-256)

### UX geral
- Login admin: `showLoginError(msg)` substitui alert nativo
- `showConvexError`: botão "Tentar novamente" + reset de overflow
- `showToast(msg, type, duration)`: notificações não-bloqueantes
- Timeout 12 s via AbortController em todas as chamadas Convex
- `convexFetch` verifica `data.status === 'error'` (HTTP 200 com erro interno)

---

## [eded343] — 2026-05-22 03:55 UTC
**chore: adiciona package.json (Convex CLI) e atualiza .gitignore**
- Inicializa npm no projeto para uso do Convex CLI
- Adiciona `convex ^1.39.1` como dependência
- Atualiza `.gitignore`: exclui `node_modules/`

---

## [11c9137] — 2026-05-22 03:53 UTC
**feat: Fase 2 — Comunicados, Documentos e Assembleias + Drawer de navegação**

### Backend (Convex)
- `schema.ts`: tabelas `announcements`, `documents`, `assemblies`, `votes`
- `convex/announcements.ts`: CRUD completo
- `convex/documents.ts`: CRUD completo
- `convex/assemblies.ts`: CRUD assembleias + CRUD votos com cascade delete

### Navegação — Drawer lateral
- Botão `≡` abre drawer slide-in com todos os módulos
- Lazy-load por módulo

### Módulos
- **Comunicados e Mural** — cards tipados, filtros, CRUD admin
- **Documentos e Atas** — grid responsivo, links externos, categorias
- **Assembleias e Votações** — pauta, ata, votações com barra de progresso

---

## [f6fa00d] — 2026-05-22 03:42 UTC
**feat: revisão completa Mobile First — responsividade e fluidez**

---

## [7c99e70] — 2026-05-22 02:54 UTC
**feat: menu hamburguer para layout mobile**

---

## [8ac9b75] — 2026-05-22 02:10 UTC
**merge: conecta dashboard ao Convex (tough-kangaroo-90)**

---

## [a2e2268] — 2026-05-22 02:08 UTC
**config: conecta dashboard ao Convex (tough-kangaroo-90)**

---

## [0ab1363] — 2026-05-22 01:30 UTC
**feat: Fase 1 — integração Convex + login admin**

- `convex/schema.ts`: tabelas `transactions` e `associates`
- `convex/transactions.ts`: importação CSV InfinitePay, deduplicação,
  resumo financeiro, fluxo mensal, top contribuintes, inadimplentes
- `convex/associates.ts`: CRUD completo, busca, resumo por status
- `index.html` + `script.js`: dashboard completo, tema claro/escuro,
  layout boxed/wide, login admin com sessionStorage

---

## [72a7a2d] — 2026-05-22 00:45 UTC
**chore: estrutura inicial de diretórios**

---

## [caff3b9 / 79d721a] — 2026-05-21
**Add files via upload** — upload inicial via interface GitHub

---

## [8a27f83] — 2026-05-21
**Initial commit** — criação do repositório `zionsti/santorini`

---

*Gerado automaticamente · AMRTS Santorini Dashboard · github.com/zionsti/santorini*
