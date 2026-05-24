# Roadmap — Sistema Santorini

> Registra as funcionalidades planejadas e em aberto. Não é uma promessa de prazo — é um guia de prioridades para o desenvolvimento contínuo.

---

## Status das fases

| Fase | Descrição | Estado |
|------|-----------|--------|
| 1A   | Backend Convex — modelo RBAC + soft deletes | ✅ Entregue |
| 1B   | Backend Convex — guards de autorização | ✅ Entregue |
| 2B   | Frontend — portal do associado + painel admin base | ✅ Entregue |
| 3    | Redirect inteligente pós-login + dashboard admin rico | 🔜 Próximo |
| 4    | Inadimplência — relatório mensal e histórico | 🔜 Planejado |
| 5    | Feedback Comunitário — canal global de escuta | ✅ MVP implementado |
| 6    | Tutoriais Inteligentes por role, área e menu | 🧭 Aprovado para planejamento |
| 7+   | Funcionalidades avançadas e SaaS multiassociação | 💡 Backlog |

---

## Fase 3 — Redirect pós-login e experiência contextual

### 3.1 Redirect inteligente por papel

Hoje, após o login todos caem em rotas fixas (`/portal/inicio` ou `/admin`).
O objetivo é **levar cada usuário direto para o que importa para ele**.

| Papel | Destino após login |
|-------|--------------------|
| `associado` / `morador` | `/portal/inicio` — resumo financeiro pessoal, status do mês, comunicados recentes |
| `diretoria` | `/admin` — dashboard rico com gráficos e tabela de transações |
| `sysadmin` | `/admin` — mesmo dashboard + acesso a `/admin/usuarios` |

**Implementação:**
- `lib/auth.tsx` → após `login()` bem-sucedido, checar `user.role` e chamar `router.push(destinoPorPapel(role))`
- Middleware `middleware.ts` → reforçar: se autenticado tentar `/login`, redirecionar para destino correto

### 3.2 Portal do Associado — "área que tem coisas para ele consumir"

A tela `/portal/inicio` precisa mostrar conteúdo acionável e personalizado:

- **Status do mês corrente** — "Em Dia ✅" ou "Pendente ⚠️" com valor em aberto
- **Últimas transações** — extrato resumido das 5 últimas movimentações da unidade
- **Comunicados não lidos** — badge com contagem + lista dos 3 mais recentes
- **Reservas futuras** — próximas reservas da unidade com data e área
- **Chamados abertos** — manutenções em aberto da unidade com status atual
- **CTA contextual** — botão de ação diferente por situação (pagar, reservar, abrir chamado)

### 3.3 Dashboard Admin — equivalente ao sistema legado

O `/admin` (visão geral) precisa ter paridade com o sistema legado (GitHub Pages):

- **Gráficos** (Chart.js ou Recharts):
  - Receitas vs Despesas por mês (barras agrupadas, últimos 12 meses)
  - Evolução do saldo em caixa (linha)
  - Distribuição por categoria de despesa (pizza/donut)
- **Cards de KPI** — Total Recebido / Total Despesas / Saldo / Nº Associados (já existem, manter)
- **Tabela de histórico de transações** — paginada, com filtro por tipo (recebido/enviado) e período
  - Colunas: Data · Descrição · Associado (mascarado para não-admin) · Valor · Tipo
  - Ordenação por coluna clicável
  - Exportação CSV

---

## Fase 4 — Inadimplência

### 4.1 Relatório de inadimplência por mês

Admins (`diretoria` e `sysadmin`) terão uma tela `/admin/inadimplencia` com:

- **Mês selecionável** — dropdown ou navegação anterior/próximo
- **Lista de inadimplentes do mês** — associados sem contribuição registrada no período
  - Colunas: Nome · Unidade · Meses em atraso · Valor acumulado · Último pagamento
- **Indicador de reincidência** — destaque visual para quem está inadimplente há 2+ meses consecutivos
- **Histórico por associado** — ao clicar, abre painel lateral com todos os meses e status de cada um

### 4.2 Backend necessário

Nova query Convex `transactions:getDefaulters`:
```ts
// args: { sessionToken, year, month }
// retorna: Array<{ associateId, name, unit, monthsOverdue, lastPayment }>
```

Lógica:
1. Buscar todos os associados ativos
2. Para cada um, verificar se há transação do tipo "recebido" no mês/ano solicitado
3. Contar meses consecutivos sem pagamento retroativamente
4. Retornar ordenado por `monthsOverdue DESC`

### 4.3 Regra de negócio a confirmar

- [ ] O que configura "inadimplência"? Ausência de qualquer contribuição no mês, ou abaixo de um valor mínimo?
- [ ] A associação envia boleto/cobrança ou é manual?
- [ ] Notificação automática por e-mail/WhatsApp está no escopo?

---

## Fase 5 — Feedback Comunitário

O Feedback Comunitário cria um canal de escuta contínua dentro do app. O MVP implementado registra categoria, mensagem, URL, rota, timestamp e, quando existir sessão, o perfil do usuário. A diretoria conta com a rota `/admin/feedbacks` para triagem, alteração de status e transformação dos registros em decisões de produto e melhorias operacionais.

---

## Fase 6 — Tutoriais Inteligentes por role, área e menu

O Santorini deve passar a ensinar o usuário enquanto ele usa o sistema. A experiência proposta, chamada **Trilha Viva Santorini**, combina documentação por perfil, cards de missão por tela, microtutorial contextual, checklist de primeira execução e feedback acoplado ao fim de cada instrução. O objetivo é orientar o usuário sobre **para que serve**, **o que pode ou deve fazer** e **como fazer** em cada funcionalidade visível para sua role.

| Role | Menus iniciais a documentar | Intenção de instrução |
|------|-----------------------------|------------------------|
| `morador` | Início, Comunicados, Suporte | Ler informações essenciais e pedir ajuda. |
| `associado` | Início, Extrato, Mensalidade, Meu Cadastro, Reservas, Comunicados, Suporte | Acompanhar finanças, manter cadastro e usar serviços. |
| `diretoria` | Dashboard, Transações, Associados, Reservas, Comunicados, Manutenção, Feedbacks | Operar a associação com rastreabilidade e governança. |
| `sysadmin` | Itens da diretoria, Usuários e parâmetros técnicos | Sustentar segurança, permissões e operação do sistema. |

---

## Fase 7+ — Backlog de funcionalidades

> Ideias levantadas, sem prioridade definida ainda.

- **Notificações push** — comunicados urgentes via PWA (service worker)
- **Área de votação em assembleias** — pauta, quórum em tempo real, resultado
- **Upload de documentos** — regulamento, atas, contratos (Convex File Storage)
- **Integração de pagamento** — link de boleto ou PIX na área do associado
- **App mobile** — React Native ou PWA instalável
- **Relatório em PDF** — extrato individual e balancete mensal para download
- **Auditoria de ações** — log de quem fez o quê no painel admin (tabela `audit_log`)
- **Multi-residencial** — isolar dados por `condoId` para reutilizar o sistema em outros empreendimentos

---

## Notas de produto

- UI text, comentários de código e documentação: **sempre em português (brasileiro)**
- Privacidade: CPF completo só para admins; portal expõe apenas `cpfPrefix`
- Soft delete universal: nunca usar `db.delete()`, sempre `deletedAt = Date.now()`
- Senhas armazenadas como SHA-256; nunca trafegar em texto puro

## Documentação complementar

A versão organizada e detalhada do roadmap está em [`docs/roadmap.md`](docs/roadmap.md), integrada aos documentos de modelo de negócio, Feedback Comunitário, tutoriais do usuário, portal do associado e registro de decisões.
