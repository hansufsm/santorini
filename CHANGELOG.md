# CHANGELOG — AMRTS Santorini Dashboard

Registro cronológico do desenvolvimento do projeto.  
Cada entrada contém: versão (hash git), timestamp e descrição das mudanças.

---

## [eded343] — 2026-05-22 03:55 UTC
**chore: adiciona package.json (Convex CLI) e atualiza .gitignore**
- Inicializa npm no projeto para uso do Convex CLI
- Adiciona `convex ^1.39.1` como dependência
- Atualiza `.gitignore`: exclui `node_modules/` (entrada duplicada removida)

---

## [11c9137] — 2026-05-22 03:53 UTC
**feat: Fase 2 — Comunicados, Documentos e Assembleias + Drawer de navegação**

### Backend (Convex)
- `schema.ts`: adição de 4 novas tabelas — `announcements`, `documents`, `assemblies`, `votes`
- `convex/announcements.ts`: CRUD completo + `getAllAnnouncements` / `getActiveAnnouncements`
- `convex/documents.ts`: CRUD completo + `getAllDocuments` / `getDocumentsByCategory`
- `convex/assemblies.ts`: CRUD assembleias + CRUD votos com cascade delete

### Navegação — Drawer lateral
- Botão `≡` na esquerda da nav abre drawer slide-in
- Módulos navegáveis: Financeiro · Comunicados · Documentos · Assembleias
- Lazy-load: cada módulo busca dados apenas ao ser acessado pela primeira vez
- Backdrop click fecha o drawer

### Módulo: Comunicados e Mural
- Cards tipados: 🔴 Urgente / 🔵 Info / 🟡 Manutenção / 🟢 Evento
- Filtros por tipo (pill buttons)
- Admin: criar / editar / excluir via modal bottom-sheet (mobile-first)

### Módulo: Documentos e Atas
- Grid responsivo 1→2→3 colunas
- Categorias: Ata / Regulamento / Contrato / Outro
- Armazenamento via links externos (Google Drive, Dropbox, etc.)
- Admin: CRUD completo

### Módulo: Assembleias e Votações
- Cards com pauta, ata resumida, local, status, número de presentes
- Votações com barra de progresso por opção (% + contagem)
- Filtros: Todas / Agendadas / Realizadas / Canceladas
- Admin: criar assembleia + registrar/editar votações aninhadas

### UX
- Modais como bottom-sheet em mobile (`rounded-t-3xl sm:rounded-3xl`)
- `setAdminMode` sincroniza botões admin em todos os módulos
- Drawer com indicador de last-update sincronizado via MutationObserver

---

## [f6fa00d] — 2026-05-22 03:42 UTC
**feat: revisão completa Mobile First — responsividade e fluidez**

### Layout geral
- Logo: `text-base md:text-xl` (evita quebra em telas < 360px)
- Padding global: `p-4 md:p-6/p-8` em todas as seções
- Gaps: `gap-3 md:gap-6`

### Hero section
- Altura progressiva: `h-44 sm:h-52 md:h-64 lg:h-80`
- Título: `text-2xl sm:text-3xl md:text-4xl`
- Descrição oculta em mobile para liberar espaço visual

### Stats cards
- Grid: `grid-cols-2` em mobile (2 cards por linha, mais compacto)
- Números grandes: `text-xl md:text-3xl`

### Gráficos
- Altura responsiva: `h-48 md:h-64`
- Header flex-col em mobile, flex-row em sm+
- Select de período: `text-xs sm:text-sm`

### Filtros e busca
- Remove `min-w-[200px]` que causava scroll horizontal
- `gap-2 md:gap-4`; seletores: `text-xs sm:text-sm`

### Tabela de transações
- Coluna "Tipo" oculta em mobile (`hidden sm:table-cell`)
- Tipo exibido inline abaixo do nome em mobile
- Padding células: `px-3 md:px-6 py-3 md:py-4`

### Paginação
- `flex-col sm:flex-row`; botões full-width em mobile
- Texto: `← Anterior` / `Próximo →`; `py-2` para tap target ≥ 44px

### Modais
- Contributor Portal: `p-4 sm:p-6 md:p-8`; busca empilhada em mobile
- Stats grid: `grid-cols-1 sm:grid-cols-3`
- Admin modal: `p-5 md:p-8`

### CSS
- `canvas { max-width: 100% }` — gráficos respeitam container
- `border-radius` suavizado em < 360px

---

## [7c99e70] — 2026-05-22 02:54 UTC
**feat: menu hamburguer para layout mobile**

- Nav mobile: apenas logo + ícone tema 🌙 + ☰ hamburguer
- Dropdown mobile com todos os controles:
  - Área do Associado, Documentação, Layout, Atualizar, Imprimir, Admin
- `controls-panel` (Layout/Tema/Imprimir) oculto em mobile (`hidden md:block`)
- `setAdminMode` atualizado para sincronizar controles admin no mobile
- Zero mudança no layout desktop

---

## [360d13d] — 2026-05-22 02:39 UTC
**ci: dispara deploy GitHub Pages**
- Commit vazio para acionar o workflow após configuração do Pages

---

## [8ac9b75] — 2026-05-22 02:10 UTC
**merge: conecta dashboard ao Convex (tough-kangaroo-90)**
- Merge da branch `claude/dev-process-memory-ZiE3X` → `main`

---

## [a2e2268] — 2026-05-22 02:08 UTC
**config: conecta dashboard ao Convex (tough-kangaroo-90)**
- Substitui placeholder `CONVEX_URL = "https://SEU_PROJETO.convex.cloud"`
  pela URL real: `https://tough-kangaroo-90.convex.cloud`
- Dashboard agora lê e persiste dados no Convex em produção

---

## [0ab1363] — 2026-05-22 01:30 UTC
**feat: Fase 1 — integração Convex + login admin mockado**

### Backend (Convex)
- `convex/schema.ts`: tabelas `transactions` e `associates`
- `convex/transactions.ts`: importação de CSV com deduplicação, queries de
  resumo, fluxo mensal, top contribuintes, histórico por associado, inadimplentes
- `convex/associates.ts`: CRUD completo de associados, busca, resumo por status

### Frontend
- `index.html`: dashboard completo com nav, hero, stats cards, gráficos,
  filtros, tabela de transações, modal Área do Associado, modal Admin
- `script.js`: integração via HTTP API do Convex (`/api/query`, `/api/mutation`),
  importação de CSV (PapaParse), paginação por mês, exportação CSV,
  tema claro/escuro, layout boxed/wide, login admin com sessão

### Módulos da Fase 1
- ✅ Transações financeiras (importação CSV InfinitePay, deduplicação)
- ✅ Cadastro de associados
- ✅ Inadimplentes (view calculada: ativos sem pagamento no mês)

---

## [72a7a2d] — 2026-05-22 00:45 UTC
**Criando pastas**
- Estrutura inicial de diretórios do projeto

---

## [caff3b9] — 2026-05-21 21:36 UTC
## [79d721a] — 2026-05-21 21:33 UTC
**Add files via upload**
- Upload inicial dos arquivos base via interface do GitHub

---

## [8a27f83] — 2026-05-21 21:31 UTC
**Initial commit**
- Criação do repositório `zionsti/santorini`

---

*Gerado automaticamente · AMRTS Santorini Dashboard · github.com/zionsti/santorini*
