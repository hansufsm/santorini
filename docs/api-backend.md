# API Backend Convex

O backend do Santorini usa funções Convex para queries e mutations. A interface web moderna chama essas funções pelo cliente Convex, enquanto a versão estática pode usar a API HTTP pública do Convex quando necessário.

## Convenção HTTP da versão estática

```http
POST /api/query
POST /api/mutation
```

O corpo de requisição segue o formato conceitual abaixo.

```json
{
  "path": "modulo:nomeDaFuncao",
  "args": {}
}
```

O Convex pode retornar erro de aplicação dentro de uma resposta HTTP bem-sucedida; por isso, clientes devem verificar o status lógico do retorno, e não apenas o código HTTP.

## Módulos atuais

| Módulo | Função principal |
|---|---|
| `transactions.ts` | Importar transações, consultar resumo, fluxo mensal, contribuintes e inadimplência. |
| `associates.ts` | Criar, atualizar, importar e consultar associados. |
| `auth.ts` | Login por senha ou CPF, criação e restauração de sessão. |
| `users.ts` | Gestão de usuários e papéis. |
| `announcements.ts` | Comunicados. |
| `documents.ts` | Documentos institucionais. |
| `assemblies.ts` | Assembleias e registros correlatos. |
| `reservations.ts` | Reservas. |
| `maintenances.ts` | Manutenção. |
| `assets.ts` | Patrimônio. |
| `suppliers.ts` | Fornecedores e prestadores. |
| `visitors.ts` | Visitantes. |
| `feedbacks.ts` | Feedback Comunitário, triagem administrativa e arquivamento. |
| `trilhaViva.ts` | Persistência de progresso dos microtutoriais e resumo administrativo. |

## Funções financeiras essenciais

| Função | Tipo | Uso |
|---|---|---|
| `transactions:importTransactions` | mutation | Importa CSV financeiro com deduplicação por chave de transação. |
| `transactions:clearAllTransactions` | mutation | Remove transações em lote, com uso restrito. |
| `transactions:getAllTransactions` | query | Lista transações. |
| `transactions:getAvailableMonths` | query | Retorna meses disponíveis. |
| `transactions:getSummary` | query | Consolida entradas, saídas e saldo. |
| `transactions:getTopContributors` | query | Ranking de contribuintes. |
| `transactions:getMonthlyFlow` | query | Fluxo mensal. |
| `transactions:getAssociateHistory` | query | Histórico de um associado por `associateId`, protegido por `sessionToken`; Associado consulta o próprio vínculo e Diretoria/Sysadmin consultam qualquer associado. |
| `transactions:getDefaulters` | query | Inadimplentes por mês. |

## Funções de associados e usuários

| Função | Tipo | Uso |
|---|---|---|
| `associates:importAssociates` | mutation | Importação em lote de associados. |
| `associates:createAssociate` | mutation | Criação individual. |
| `associates:updateAssociate` | mutation | Atualização individual. |
| `associates:clearAllAssociates` | mutation | Limpeza em lote com uso restrito. |
| `auth:loginWithPassword` | mutation | Login administrativo. |
| `auth:loginWithCpf` | mutation | Login simplificado de associado quando aplicável. |
| `auth:getSession` | query | Restaura sessão pelo token. |
| `users:*` | query/mutation | Gestão de usuários e papéis; Diretoria consulta/cadastra perfis operacionais e Sysadmin administra perfis sensíveis. |

## Contratos administrativos de usuários e transações

| Contrato | Campos principais | Regra de autorização |
|---|---|---|
| Consulta de usuários | `users:getAllUsers`, `sessionToken`. | Diretoria e Sysadmin listam usuários visíveis; Sysadmin preserva acesso total. |
| Criação de usuários | `users:createUser`, `sessionToken`, `name`, `email`, `passwordHash`, `role`, `unit` opcional. | Diretoria cria apenas `associado` e `morador`; Sysadmin também cria `diretoria` e `sysadmin`, respeitando o limite de sysadmins ativos. |
| Inativação/reativação | `users:deactivateUser` ou `users:reactivateUser`, `sessionToken`, `id`. | Diretoria não altera perfis `diretoria` ou `sysadmin`; Sysadmin mantém proteção contra remoção do último sysadmin ativo. |
| Histórico financeiro por associado | `transactions:getAssociateHistory`, `sessionToken`, `associateId`. | Associado consulta somente o próprio vínculo; Diretoria/Sysadmin consultam por combobox administrativo em `/admin/transacoes`. |

## API implementada para Feedback Comunitário

| Função | Tipo | Responsabilidade |
|---|---|---|
| `feedbacks:createFeedback` | mutation | Gravar feedback enviado por usuário autenticado ou visitante permitido. |
| `feedbacks:listFeedbacks` | query | Listar registros para painel administrativo, filtrando por associação, categoria e status. |
| `feedbacks:updateFeedbackStatus` | mutation | Atualizar status e metadados de triagem. |
| `feedbacks:archiveFeedback` | mutation | Arquivar feedback sem exclusão física. |

O contrato inicial de criação aceita categoria e mensagem do usuário, combinadas com metadados de contexto enviados pelo frontend. O backend valida tamanho de mensagem, categoria permitida e associação de destino antes de inserir o registro. A listagem administrativa exige sessão com papel autorizado e permite filtro por status, categoria e associação.

## API implementada para Trilha Viva Santorini

O módulo `trilhaViva.ts` persiste o progresso individual dos microtutoriais contextuais por usuário, rota, papel e associação. As funções de uso do portal aceitam sessão de qualquer perfil autenticado a partir de `morador`; as funções administrativas exigem pelo menos `diretoria`.

| Função | Tipo | Responsabilidade |
|---|---|---|
| `trilhaViva:getMyProgress` | query | Retornar o progresso do usuário autenticado para a rota atual, calculando o `guideId` a partir da rota e do papel da sessão. |
| `trilhaViva:touchGuide` | mutation | Criar ou atualizar o registro quando o usuário abre o card da Trilha Viva, marcando `lastOpenedAt` e status `em_andamento` quando ainda não concluído. |
| `trilhaViva:completeGuide` | mutation | Marcar o guia como `concluido`, registrar `completedAt`, atualizar `lastOpenedAt` e incrementar `completionCount`. |
| `trilhaViva:restartGuide` | mutation | Reiniciar um guia existente, removendo `completedAt`, registrando `restartedAt` e definindo status `reiniciado`. |
| `trilhaViva:listProgress` | query | Listar registros para o painel administrativo com filtros opcionais por associação, status, role e rota. |
| `trilhaViva:getProgressSummary` | query | Consolidar totais por status, agregação por rota e registros recentes para `/admin/trilha-viva`. |

| Contrato | Campos principais |
|---|---|
| Leitura do próprio progresso | `sessionToken`, `route`. |
| Abertura/conclusão do guia | `sessionToken`, `associationId` opcional, `route`, `menuLabel`. |
| Reinício do guia | `sessionToken`, `route`. |
| Listagem administrativa | `sessionToken`, `associationId` opcional, `status` opcional, `role` opcional, `route` opcional. |
| Resumo administrativo | `sessionToken`, `associationId` opcional. |

A experiência frontend usa `components/trilha-viva-guide.tsx` para sincronizar o estado remoto e manter fallback em `localStorage` quando a chamada Convex não estiver disponível. O painel `/admin/trilha-viva` consome `getProgressSummary` e `listProgress` para exibir métricas, filtros e pontos de dificuldade por menu.

## Integrações externas planejadas

As integrações com serviços externos devem ser planejadas como módulos isolados, com tokens armazenados em variáveis de ambiente, chamadas auditáveis e nenhuma automação irreversível sem confirmação administrativa. A implementação futura deve evitar acoplamento direto entre inadimplência e bloqueios sem regra formal aprovada pela associação.

| Integração | Escopo futuro | Requisitos mínimos antes de implementar |
|---|---|---|
| Redomus | Comunicação API + token para inativar ou reativar acesso às câmeras de associados inadimplentes. | Definir contrato de API, token seguro, regra de inadimplência, confirmação manual, log de auditoria, tela de revisão e fluxo de reversão. |
| CamobiSegura | API de contato para botão do pânico e outras funcionalidades de segurança comunitária. | Definir evento de acionamento, autenticação, payload mínimo, registro de acionamentos, política de privacidade, teste controlado e prevenção de falsos positivos. |

## Cuidados operacionais

| Cuidado | Motivo |
|---|---|
| Validar `data.status` em chamadas HTTP | Erros de aplicação podem vir em HTTP 200. |
| Evitar mutations destrutivas sem confirmação | Dados financeiros e cadastrais exigem rastreabilidade. |
| Usar soft delete em registros sensíveis | Preserva auditoria e reduz risco operacional. |
| Proteger histórico financeiro por sessão | Evita que dados de contribuição sejam recuperados por nome digitado ou consulta sem vínculo autenticado. |
| Auditar integrações externas | Redomus, CamobiSegura e serviços semelhantes podem afetar segurança física, privacidade ou acesso a recursos sensíveis. |
| Filtrar por `associationId` em novos módulos | Prepara o produto para SaaS multiassociação. |
| Manter fallback local em experiências de orientação | Evita perda de usabilidade quando a sincronização remota falha. |
| Documentar novas funções | Evita divergência entre frontend, backend e suporte. |

## Referências internas

[1]: ../convex "Diretório de funções Convex"
[2]: schema-banco.md "Schema do banco"
[3]: feedback-comunitario.md "Feedback Comunitário"
[4]: tutoriais-usuario.md "Tutoriais do usuário"
