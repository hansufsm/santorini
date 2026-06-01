# Arquitetura Técnica do Santorini

O Santorini combina uma versão estática publicada no GitHub Pages com uma aplicação Next.js em evolução e backend Convex. Essa estratégia preserva a operação pública atual enquanto permite modernizar o produto para portal, painel administrativo, autenticação, módulos avançados e futura operação SaaS.

## Visão geral

```text
Usuário no navegador
  ├─ Acesso público estático: GitHub Pages
  │   ├─ index.html
  │   ├─ script.js
  │   ├─ Tailwind CDN
  │   ├─ Chart.js
  │   └─ PapaParse
  │
  └─ Aplicação moderna: Next.js App Router
      ├─ app/page.tsx
      ├─ app/login/page.tsx
      ├─ app/admin/*
      ├─ app/portal/*
      └─ lib/auth.tsx

Backend Convex
  ├─ schema.ts
  ├─ auth.ts
  ├─ transactions.ts
  ├─ associates.ts
  ├─ users.ts
  └─ módulos operacionais
```

A premissa técnica é manter o frontend desacoplado de servidores próprios sempre que possível. O Convex concentra persistência, queries e mutations, enquanto o frontend cuida da experiência de uso e da autenticação de sessão no cliente.

## Stack principal

| Camada | Tecnologia | Função |
|---|---|---|
| Frontend moderno | Next.js App Router, React e TypeScript | Rotas públicas, portal, painel administrativo e componentes interativos. |
| Estilo | Tailwind CSS | Layout responsivo e sistema visual. |
| Gráficos | Recharts no Next.js e Chart.js na versão estática | Visualização de indicadores financeiros. |
| Ícones | Lucide React | Ícones de interface. |
| Backend | Convex | Banco, queries, mutations e autenticação serverless. |
| Publicação atual | GitHub Pages | Hospedagem da versão estática. |
| Publicação planejada | Vercel | Caminho natural para produção da aplicação Next.js. |

## Rotas da aplicação Next.js

| Grupo | Rotas atuais | Finalidade |
|---|---|---|
| Público | `/`, `/login` | Entrada pública, autenticação e redirecionamento contextual. |
| Admin | `/admin`, `/admin/associados`, `/admin/comunicados`, `/admin/feedbacks`, `/admin/manutencao`, `/admin/reservas`, `/admin/transacoes`, `/admin/usuarios` | Gestão operacional e administrativa, incluindo triagem de Feedback Comunitário. As rotas `/admin/transacoes` e `/admin/usuarios` são exclusivas de **sysadmin**. |
| Portal | `/portal`, `/portal/inicio`, `/portal/extrato`, `/portal/mensalidade`, `/portal/comunicados`, `/portal/reservas`, `/portal/suporte`, `/portal/cadastro` | Área dedicada para associados e moradores. |

## Backend Convex

| Arquivo | Responsabilidade |
|---|---|
| `convex/schema.ts` | Define tabelas, campos e índices. |
| `convex/auth.ts` | Login, sessão, restauração de sessão e regras de autenticação. |
| `convex/transactions.ts` | Importação, consultas e indicadores financeiros. |
| `convex/associates.ts` | Cadastro e consulta de associados. |
| `convex/users.ts` | Usuários, papéis e gestão administrativa. |
| `convex/announcements.ts` | Comunicados. |
| `convex/reservations.ts` | Reservas de áreas comuns. |
| `convex/maintenances.ts` | Chamados e manutenção. |
| `convex/feedbacks.ts` | Criação, listagem administrativa e triagem de Feedback Comunitário. |
| `convex/assets.ts` | Patrimônio. |
| `convex/suppliers.ts` | Fornecedores e prestadores. |

## Autenticação e sessão

O frontend usa `lib/auth.tsx` para armazenar a sessão em cookie com validade de oito horas. A sessão contém dados do usuário, papel, status, unidade, vínculo com associado e token. A aplicação deve restaurar esse estado ao carregar e reagir a mudanças de sessão por evento interno.

| Elemento | Comportamento |
|---|---|
| Cookie | `santorini_session`, com `SameSite=Lax` e expiração configurada. |
| Papéis | `sysadmin`, `diretoria`, `associado` e `morador`. |
| Redirecionamento | Usuário autenticado deve ser encaminhado ao contexto adequado sem novo login. |
| Rotas exclusivas de sysadmin | `/admin/transacoes` e `/admin/usuarios` devem validar `session.role === "sysadmin"` no frontend, ocultar itens de navegação para outros papéis e depender de `requireRole(..., "sysadmin")` no Convex para defesa em profundidade. |
| Logout | Remove cookie e atualiza o estado global. |

## Estratégia SaaS

A arquitetura deve evoluir de uma implantação AMRTS para uma plataforma multiassociação. A regra de evolução é que novos módulos sensíveis, como Feedback Comunitário, já devem nascer com `associationId`. Tabelas existentes podem ser migradas gradualmente quando houver necessidade real de atender múltiplos clientes no mesmo backend.

| Área | Diretriz multiassociação |
|---|---|
| Dados | Introduzir `associationId` em novas tabelas e planejar migração nas existentes. |
| Marca | Parametrizar nome, logo e cores por associação. |
| Usuários | Vincular sessão e permissões à associação corrente. |
| Consultas | Filtrar por associação antes de retornar dados ao frontend. |
| Administração | Permitir visão por associação apenas para papéis autorizados. |

## Versão estática e transição

A versão estática continua relevante porque está publicada e acessível no GitHub Pages. Ela deve receber correções críticas de sessão, identidade e experiência enquanto a aplicação Next.js amadurece. A transição para Next.js em produção deve ocorrer quando as rotas essenciais e o deploy estiverem estáveis.

| Critério | GitHub Pages estático | Next.js/Vercel |
|---|---:|---:|
| Publicação atual | Sim | Planejada. |
| Rotas dinâmicas | Limitadas | Nativas. |
| Autenticação contextual | Implementada com JavaScript | Estruturada com React/contexto. |
| Evolução de portal | Limitada | Adequada. |
| Escala SaaS | Baixa | Melhor base. |

## Referências internas

[1]: schema-banco.md "Schema do banco de dados"
[2]: api-backend.md "API Backend Convex"
[3]: operacoes.md "Operações e deploy"
