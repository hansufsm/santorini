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
| `transactions:getAssociateHistory` | query | Histórico de um associado. |
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
| `users:*` | query/mutation | Gestão de usuários e papéis. |

## API planejada para Feedback Comunitário

| Função | Tipo | Responsabilidade |
|---|---|---|
| `feedbacks:createFeedback` | mutation | Gravar feedback enviado por usuário autenticado ou visitante permitido. |
| `feedbacks:listFeedbacks` | query | Listar registros para painel administrativo, filtrando por associação, categoria e status. |
| `feedbacks:getFeedback` | query | Obter detalhes de um feedback específico. |
| `feedbacks:updateFeedbackStatus` | mutation | Atualizar status e metadados de triagem. |

O contrato inicial de criação deve aceitar categoria e mensagem do usuário, combinadas com metadados de contexto enviados pelo frontend. O backend deve validar tamanho de mensagem, categoria permitida e associação de destino antes de inserir o registro.

## Cuidados operacionais

| Cuidado | Motivo |
|---|---|
| Validar `data.status` em chamadas HTTP | Erros de aplicação podem vir em HTTP 200. |
| Evitar mutations destrutivas sem confirmação | Dados financeiros e cadastrais exigem rastreabilidade. |
| Usar soft delete em registros sensíveis | Preserva auditoria e reduz risco operacional. |
| Filtrar por `associationId` em novos módulos | Prepara o produto para SaaS multiassociação. |
| Documentar novas funções | Evita divergência entre frontend, backend e suporte. |

## Referências internas

[1]: ../convex "Diretório de funções Convex"
[2]: schema-banco.md "Schema do banco"
[3]: feedback-comunitario.md "Feedback Comunitário"
