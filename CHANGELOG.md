# Changelog — Sistema Santorini

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
