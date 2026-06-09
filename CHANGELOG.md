# Changelog — Sistema Santorini

## [Sessão 2026-06-08] — Telegram, Alertas e Extrato Público

### Extrato Financeiro Público
- **Nova Rota Pública (Extrato Anual)**: Criada a rota `/[cpfPrefix]` (em [app/[cpfPrefix]/page.tsx](file:///home/hans/devworkspace/santorini/app/[cpfPrefix]/page.tsx)) que permite a consulta do extrato de um associado na raiz do site sem necessidade de login, agrupando as transações por ano e mostrando um painel de acumulados por exercício fiscal.
- **Middleware Whitelist**: Atualizado [proxy.ts](file:///home/hans/devworkspace/santorini/proxy.ts) para liberar o acesso a qualquer rota numérica de 4 dígitos na raiz (ex: `/1234`) sem validação de sessão.
- **Nova Query Convex**: Adicionado [getPublicAssociateHistory](file:///home/hans/devworkspace/santorini/convex/transactions.ts#L446) em [convex/transactions.ts](file:///home/hans/devworkspace/santorini/convex/transactions.ts) para buscar e agrupar as contribuições de um associado usando apenas os 4 primeiros dígitos do CPF, calculando os totais anuais e omitindo dados sensíveis de pagadores.
- **Alerta de Acesso**: Adicionado o mutation [logPublicAccess](file:///home/hans/devworkspace/santorini/convex/telegram.ts#L208) em [convex/telegram.ts](file:///home/hans/devworkspace/santorini/convex/telegram.ts) que é disparado via `useEffect` no carregamento da rota pública, notificando a diretoria pelo Telegram sobre qual associado teve o extrato visualizado, qual prefixo de CPF foi consultado e se o usuário estava logado no sistema (registrando o ID e o Nome do visualizador autenticado).

### Integração Telegram & Notificações Outbound
- **Alertas de Atividades no Site (Outbound)**: Implementação de envio proativo de alertas em Markdown para o canal/grupo da diretoria (`TELEGRAM_CHAT_ID`) utilizando a action [sendAlertAction](file:///home/hans/devworkspace/santorini/convex/telegram.ts#L149).
  - Gatilho de novos feedbacks (`createFeedback` em [feedbacks.ts](file:///home/hans/devworkspace/santorini/convex/feedbacks.ts)).
  - Gatilho de novos chamados de manutenção (`createMaintenance` em [maintenances.ts](file:///home/hans/devworkspace/santorini/convex/maintenances.ts)).
  - Gatilho de novas solicitações de reserva (`createReservation` em [reservations.ts](file:///home/hans/devworkspace/santorini/convex/reservations.ts)).
  - Gatilho de logins bem-sucedidos por CPF ou Email/Senha (`loginWithCpf` e `loginWithPassword` em [auth.ts](file:///home/hans/devworkspace/santorini/convex/auth.ts)).
- **Toggle de Desativação Sysadmin**: Criada a feature flag `integration_telegram` (inativa por padrão) na tabela `systemSettings` em [settings.ts](file:///home/hans/devworkspace/santorini/convex/settings.ts).
- **Ocultamento no Portal do Morador**: A tela [cadastro/page.tsx](file:///home/hans/devworkspace/santorini/app/portal/cadastro/page.tsx) oculta completamente o card de vinculação do Telegram quando a flag estiver inativa.
- **Proteção do Webhook & Mutações**: O webhook de recebimento de comandos do Telegram ([http.ts](file:///home/hans/devworkspace/santorini/convex/http.ts)) e as mutations de vinculação ([telegram.ts](file:///home/hans/devworkspace/santorini/convex/telegram.ts)) foram blindados para retornar silêncio ou erros se a flag estiver inativa, impedindo interações não autorizadas.

## [Sessão 2026-05-23] — Diagnóstico, correções de infraestrutura e UX

### Bug crítico — `auth:loginWithCpf` / `auth:loginWithPassword` não encontrados

**Causa raiz identificada:** `convex/auth.ts` exportava simultaneamente funções Convex
(`export const loginWithCpf = mutation({...})`) e uma função TypeScript pura
(`export async function requireRole(...)`). O bundler do Convex trata arquivos com
exports mistos como módulos de helper interno e silenciosamente não registra nenhuma
das funções públicas. Os queries de outros módulos funcionavam porque esses arquivos
só exportavam funções Convex puras.

**Correção:**
- `convex/_lib.ts` criado com `requireRole` + tipo `Role` (prefixo `_` = helper, nunca exposto como módulo de funções)
- `convex/auth.ts` reescrito para exportar **apenas** `mutation`/`query`
- Todos os módulos que importavam `requireRole` de `./auth` atualizados para `./_lib`

### Bug — Imagem do hero não aparecia na frontpage

**Causa:** uso de `<img src="/santorini.webp">` simples em vez do componente `<Image>` do Next.js,
que é o mecanismo correto para arquivos estáticos no App Router.

**Correção:** substituído por `<Image fill priority sizes="...">` do `next/image`.

### Infraestrutura — Deploy do Convex

**Problema:** o Convex é um serviço independente do Vercel. Cada mudança em `convex/`
exige `npx convex deploy` separado — sem isso, o frontend atualiza mas o backend
continua com o código antigo, causando "Server Error" no login.

**Soluções documentadas e implementadas:**

| Opção | Descrição | Status |
|-------|-----------|--------|
| A — Vercel build command | `npm run build:full` (`convex deploy + next build`). `CONVEX_DEPLOY_KEY` nas env vars da Vercel — mesma interface já conhecida. | **Recomendada** |
| B — GitHub Actions | `.github/workflows/convex-deploy.yml` dispara no push quando `convex/**` muda. Requer secret no GitHub. | Disponível |
| C — Manual | `npx convex deploy --typecheck disable` no Codespace. | Fallback |

**Hook de aviso:** `.claude/settings.json` com `PostToolUse/Bash` — detecta `git push`
com mudanças em `convex/` e exibe lembrete automático para rodar o deploy.

### Produto — Roadmap criado

`ROADMAP.md` criado com:
- **Fase 3:** redirect pós-login por papel; portal do associado com conteúdo acionável;
  dashboard admin com gráficos equivalentes ao sistema legado
- **Fase 4:** relatório de inadimplência por mês (corrente e histórico)
- **Fase 5+:** backlog (push notifications, votações, upload de documentos, pagamentos, PWA, PDF, auditoria, multi-residencial)

### UX — Frontpage

- Foto aérea real do Residencial Santorini adicionada ao hero (`public/santorini.webp`, 177 KB otimizado de 2,7 MB PNG via WebP q82)
- Efeito zoom suave no hover (`group-hover:scale-105`, 700 ms) sobre a foto
- Overlay gradiente esmeralda semitransparente preserva legibilidade do texto

---

## [Infra] — 2026-05-23

### CI/CD — Deploy automático do Convex via GitHub Actions

**Problema:** o backend Convex precisa de um comando `npx convex deploy` separado sempre que arquivos em `convex/` mudam. Sem esse passo, o Vercel sobe o frontend atualizado mas o backend continua com o código antigo, causando erros "Server Error" no login e nas queries (tabelas e índices novos não existem no banco em produção).

**Decisão — Opção A (Vercel build command):** alterar o Build Command da Vercel para `npm run build:full` (`npx convex deploy --typecheck disable && next build`) e adicionar `CONVEX_DEPLOY_KEY` nas variáveis de ambiente da Vercel. Deploy do Convex e do Next.js ocorrem na mesma pipeline, sem configuração extra no GitHub.

**Opção B (GitHub Actions):** `.github/workflows/convex-deploy.yml` dispara deploy do Convex separadamente a cada push em `convex/**`. Requer configurar `CONVEX_DEPLOY_KEY` como secret no GitHub — mais trabalhoso para quem não tem familiaridade com GitHub Secrets.

**Opção A é recomendada** por usar a mesma interface (Vercel) onde `NEXT_PUBLIC_CONVEX_URL` já está configurado.

**Descartada:** deploy manual (`npx convex deploy` localmente) — propensa a esquecimento.

### Correções de UX

- Substituído `<img src="/santorini.webp">` por `<Image fill priority>` do `next/image` no hero da frontpage — resolve a imagem não aparecer no App Router do Next.js
- Melhorado `DEPLOY.md`: explica a distinção Vercel vs Convex, checklist de deploy do zero, e instruções para configurar o `CONVEX_DEPLOY_KEY`

---

## [Fase 2B] — 2026-05-22

### Frontend Next.js — Portal e Admin completos

#### Portal do Associado (`/portal/*`)
- **inicio**: resumo financeiro pessoal (total contribuído, meses ativos, status do mês)
- **extrato**: tabela completa de transações com valores coloridos (recebido/enviado)
- **mensalidade**: status em dia / pendente + histórico dos últimos 12 meses
- **cadastro**: dados do perfil + edição de e-mail e telefone (autoatendimento)
- **reservas**: lista de reservas da unidade + formulário de nova solicitação
- **comunicados**: comunicados ativos com badges por tipo (info/urgente/manutenção/evento)
- **suporte**: abertura de chamados (título auto-prefixado com unidade) + lista geral

#### Painel Administrativo (`/admin/*`)
- **visão geral**: dashboard com estatísticas reais (financeiro + operacional)
- **transações**: importação CSV com parser inline (InfinitePay), preview e lista
- **associados**: busca por nome/unidade/CPF, gerenciamento de status inline
- **reservas**: pendentes destacadas com botões confirmar/cancelar, histórico em tabela
- **comunicados**: formulário de criação + lista com inativação por soft delete
- **manutenção**: chamados ativos com fluxo Aberto→Em Andamento→Concluído, histórico
- **usuários** (Sysadmin): criar usuário com hash SHA-256 no browser, inativar/reativar

#### Infraestrutura
- `lib/convex.ts`: helpers `convexQuery`, `convexMutation`, `useConvexQuery` (fetch direto, sem tipos gerados)
- `lib/utils.ts`: `formatCurrency`, `formatDate`, `formatTimestamp`, `formatCPF`, `addDays`
- `DEPLOY.md`: guia completo de configuração na Vercel

---

## [Fase 1B] — 2026-05-22

### Backend Convex — Autorização RBAC

Todas as mutations que alteram dados agora exigem `sessionToken` válido:

| Mutation | Papel mínimo |
|---|---|
| `transactions:importTransactions` | diretoria |
| `announcements:create/update/delete` | diretoria |
| `reservations:updateReservation` | diretoria |
| `reservations:deleteReservation` | diretoria |
| `reservations:createReservation` | morador |
| `maintenances:update/delete` | diretoria |
| `maintenances:createMaintenance` | morador |
| `associates:create/update/updateStatus` | diretoria |
| `associates:updateAssociateContact` | morador (próprios dados) |

---

## [Fase 1A + Merge] — 2026-05-22

### Backend Convex — Novo modelo de papéis e soft deletes

- Nova tabela `users` com papéis: sysadmin, diretoria, associado, morador
- Nova tabela `sessions` com tokens de 64 chars (validade 8h)
- Campo `deletedAt` em todas as tabelas (soft delete universal)
- `convex/auth.ts`: loginWithCpf, loginWithPassword, logout, getSession, seedFirstSysadmin
- `convex/users.ts`: CRUD com guards (max 2 sysadmins, sysadmin imutável por outros)
- Migração progressiva: associados sem conta no novo sistema recebem papel "associado" automaticamente no primeiro login

### Frontend Next.js — Estrutura base
- Projeto Next.js 16.2.6 em `nextjs/` com App Router
- Tailwind CSS 4, Convex React SDK
- `proxy.ts`: proteção de rotas /portal/* e /admin/* por cookie de sessão
- `lib/auth.tsx`: AuthProvider + useAuth + helpers de cookie
- Página de login com CPF (Associado/Morador) e email+senha (Diretoria/Sysadmin)
- `DEPLOY.md`: instruções de deploy na Vercel
