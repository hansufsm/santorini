# Schema do Banco de Dados

O banco Convex do Santorini organiza dados financeiros, usuários, associados, comunicação, governança e módulos operacionais. A política predominante é preservar histórico e evitar exclusão definitiva de dados sensíveis por meio de `deletedAt` quando aplicável.

## Tabelas atuais

| Tabela | Finalidade | Índices principais |
|---|---|---|
| `transactions` | Transações financeiras importadas de CSV da InfinitePay. | `by_date`, `by_key`, `by_detail`, `by_date_detail`. |
| `associates` | Titulares financeiros e dados cadastrais. | `by_status`, `by_unit`, `by_name`, `by_cpf_prefix`. |
| `announcements` | Comunicados publicados para a comunidade. | `by_active`, `by_type`. |
| `documents` | Documentos institucionais, atas, regulamentos e contratos. | `by_category`, `by_date`. |
| `assemblies` | Assembleias ordinárias e extraordinárias. | `by_date`, `by_status`. |
| `votes` | Votações vinculadas a assembleias. | `by_assembly`. |
| `suppliers` | Fornecedores e prestadores. | `by_status`, `by_category`, `by_name`. |
| `assets` | Patrimônio da associação. | `by_status`, `by_category`. |
| `reservations` | Reservas de áreas comuns. | `by_date`, `by_area`, `by_status`, `by_unit`. |
| `maintenances` | Chamados e registros de manutenção. | `by_status`, `by_priority`. |
| `visitors` | Controle operacional de visitantes. | `by_date`, `by_unit`, `by_status`. |
| `users` | Usuários e papéis do sistema. | `by_email`, `by_role`, `by_status`, `by_associate`, `by_parent_associate`. |
| `sessions` | Sessões autenticadas. | `by_token`, `by_user`. |
| `feedbacks` | Feedback Comunitário enviado pelo app. | `by_association`, `by_status`, `by_category`, `by_association_status`, `by_created_at`. |

## Papéis de usuário

| Papel | Escopo |
|---|---|
| `sysadmin` | Administração técnica e máxima permissão. Deve ser restrito. |
| `diretoria` | Gestão administrativa da associação. |
| `associado` | Titular financeiro com acesso ao próprio histórico. |
| `morador` | Usuário vinculado à unidade, sem acesso financeiro completo quando não autorizado. |

## Política de exclusão

Registros operacionais e sensíveis devem usar soft delete quando houver risco de perda de histórico, auditoria ou rastreabilidade. Sessões são exceção: podem ser removidas de fato no logout ou expiração operacional.

| Tabela | Usa `deletedAt` | Observação |
|---|---:|---|
| `transactions` | Sim | Protege histórico financeiro. |
| `associates` | Sim | Evita perda cadastral. |
| `announcements` | Sim | Permite desativação sem perder histórico. |
| `reservations` | Sim | Mantém rastreabilidade de agenda. |
| `maintenances` | Sim | Mantém histórico de chamados. |
| `users` | Sim | Evita apagar usuários de auditoria. |
| `sessions` | Não | Pode ser removida como controle de autenticação. |

## Tabela implementada: `feedbacks`

A tabela `feedbacks` foi implementada para o MVP do Feedback Comunitário. Ela já nasce preparada para multiassociação por meio de `associationId`, ainda que a implantação inicial use apenas a AMRTS.

| Campo | Tipo conceitual | Obrigatório | Observação |
|---|---|---:|---|
| `associationId` | string/id | Sim | Identifica a associação cliente. |
| `category` | string union | Sim | `sugestao`, `problema`, `elogio`, `duvida` ou `outro`. |
| `message` | string | Sim | Texto enviado pelo usuário. |
| `url` | string | Sim | URL completa de origem. |
| `route` | string | Sim | Rota interna de origem. |
| `userId` | id opcional | Não | Usuário autenticado, quando houver. |
| `userRole` | string opcional | Não | Papel da sessão no momento do envio. |
| `status` | string union | Sim | `novo`, `em_analise`, `resolvido` ou `arquivado`. |
| `createdAt` | number | Sim | Timestamp de criação. |
| `updatedAt` | number | Sim | Timestamp de atualização. |
| `screenshotUrl` | string opcional | Não | Futuro, com consentimento explícito. |
| `deletedAt` | number opcional | Não | Soft delete aplicado quando o feedback é arquivado. |

Os índices implementados para a etapa inicial são `by_association`, `by_status`, `by_category`, `by_association_status` e `by_created_at`. Para operação SaaS, a query administrativa deve combinar filtro por associação e status antes de retornar registros ao painel.

## Evolução para multiassociação

As tabelas atuais foram concebidas para a implantação AMRTS. A evolução SaaS deve introduzir isolamento lógico por associação em etapas controladas, evitando migração ampla antes de necessidade comercial validada.

| Etapa | Ação |
|---:|---|
| 1 | Novas tabelas, como `feedbacks`, já devem incluir `associationId`. |
| 2 | Configurar tabela futura de associações/clientes com nome, logo, plano e status. |
| 3 | Migrar usuários para carregar associação corrente. |
| 4 | Migrar tabelas financeiras e operacionais com scripts auditáveis. |
| 5 | Revisar todas as queries para exigir filtro por associação. |

## Referências internas

[1]: ../convex/schema.ts "Schema Convex atual"
[2]: feedback-comunitario.md "Feedback Comunitário"
[3]: arquitetura.md "Arquitetura técnica"
