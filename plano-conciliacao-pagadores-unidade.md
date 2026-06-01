# Plano de conciliação de pagamentos por unidade, CPF e aliases de pagador

## Objetivo

O objetivo é permitir que o sistema Santorini reconheça pagamentos feitos por identificações diferentes, mas referentes à mesma associação. Exemplos práticos incluem um associado que paga ora com o próprio nome, ora com apelido, empresa ou descrição bancária alternativa, e casos em que o pagamento é feito por cônjuge, familiar ou terceiro.

A recomendação central é usar a **Unidade** como vínculo operacional principal para verificação de adimplência, mantendo o **CPF** como identificador sensível e complementar. O campo `name` da transação deve continuar registrando quem efetivamente apareceu no extrato, enquanto o sistema deve permitir vincular esse pagador a um **associado responsável** e a uma **unidade**.

## Diagnóstico do modelo atual

Atualmente, os associados possuem `name`, `unit`, `cpf`, `cpfPrefix`, status e dados de contato. As transações importadas possuem `date`, `time`, `type`, `name`, `detail`, `value`, `originalValue` e `transactionKey`. A identificação de histórico financeiro e inadimplência ainda depende principalmente de comparação textual entre o nome do associado e o nome vindo na transação.

Esse modelo é insuficiente para cenários como “Amilton paga como MACPELA” ou “Maria Lúcia tem pagamento feito por Paulo”, porque o nome do extrato não necessariamente corresponde ao titular financeiro cadastrado.

## Regra de negócio proposta

A unidade deve ser tratada como o centro da obrigação associativa. O CPF identifica o titular/responsável financeiro, mas não deve ser o único critério de baixa de pagamento, porque o pagamento pode vir de terceiro. O nome do pagador no extrato deve ser preservado como evidência, não como verdade cadastral.

| Conceito | Função recomendada | Exemplo |
|---|---|---|
| Unidade | Chave operacional para verificar adimplência | Casa 12, Apto 204 |
| Associado responsável | Pessoa titular da associação | Maria Lúcia |
| CPF | Identificador sensível do titular, usado para login, filtro e desambiguação | CPF da Maria Lúcia |
| Pagador efetivo | Nome que aparece no extrato/importação | Paulo |
| Alias de pagamento | Nome alternativo aprovado pela diretoria para bater com a unidade | MACPELA, Paulo, PIX Empresa X |
| Conciliação | Vínculo entre transação e associado/unidade | Transação X pertence à Unidade 12 |

## Modelo de dados sugerido

A implementação mais segura é criar uma tabela própria de aliases de pagamento e acrescentar campos opcionais de conciliação nas transações. Assim, o extrato original permanece íntegro e a diretoria ganha controle auditável sobre os vínculos.

| Entidade | Campos sugeridos | Observação |
|---|---|---|
| `paymentAliases` | `associateId`, `unit`, `aliasName`, `normalizedAlias`, `relationship`, `notes`, `confidence`, `active`, `createdBy`, `createdAt`, `updatedAt`, `deletedAt` | Guarda nomes alternativos autorizados para um associado/unidade. |
| `transactions` | `matchedAssociateId`, `matchedUnit`, `matchedAliasId`, `matchedBy`, `matchedAt`, `matchConfidence`, `matchStatus` | Não substitui `name`; apenas registra a conciliação. |
| `associates` | manter `unit` e `cpf`; opcionalmente `unitNormalized` | Unidade continua sendo campo-chave para relatórios. |

## Status de conciliação

| Status | Significado | Ação esperada |
|---|---|---|
| `unmatched` | Transação recebida sem vínculo confiável | Diretoria revisa manualmente. |
| `suggested` | Sistema encontrou possível vínculo | Diretoria confirma ou rejeita. |
| `confirmed` | Vínculo aprovado manualmente ou por regra confiável | Entra na verificação de adimplência. |
| `ignored` | Transação não deve contar como associação | Exemplo: reembolso, erro, transferência interna. |
| `conflict` | Mais de uma unidade/associado parece compatível | Exigir decisão manual. |

## Fluxo recomendado para a diretoria

Ao importar transações, o sistema deve tentar conciliar cada recebimento em três camadas. Primeiro, procura alias exato normalizado. Depois, procura nome do associado normalizado. Em seguida, sugere correspondências aproximadas, mas sem marcar automaticamente como quitado se houver ambiguidade.

A diretoria deve ter uma tela de “Conciliação de Pagamentos” com agrupamento por mês e filtros por unidade, CPF parcial, associado, pagador, status de conciliação e valor. Cada transação não conciliada deve oferecer a ação “vincular à unidade/associado” e a opção “salvar este pagador como alias para próximos meses”.

## Inadimplência

Para inadimplência, a pergunta correta deixa de ser “o nome do associado apareceu no extrato?” e passa a ser “a unidade teve pagamento confirmado no período?”. Portanto, a régua de adimplência deve considerar pagamentos com `matchStatus = confirmed` e `matchedUnit` correspondente à unidade do associado ativo.

| Critério | Antes | Depois |
|---|---|---|
| Pagamento reconhecido | Nome da transação parecido com nome do associado | Transação conciliada com unidade/associado. |
| Filtro administrativo | Nome e CPF parcial | Unidade, CPF parcial, associado, pagador efetivo e alias. |
| Inadimplência | Associado sem nome no extrato do mês | Unidade ativa sem pagamento confirmado no mês. |
| Auditoria | Baixa implícita por texto | Baixa explícita com quem conciliou e quando. |

## Priorização de implementação

1. Criar tabela `paymentAliases` e campos opcionais de conciliação em `transactions`.
2. Criar tela de conciliação para diretoria/sysadmin com transações não conciliadas.
3. Permitir vincular uma transação a uma unidade/associado e salvar alias.
4. Alterar `getAssociateHistory` e `getDefaulters` para usar vínculos confirmados por unidade.
5. Adicionar filtros por unidade, CPF parcial, pagador efetivo, alias e status de conciliação.
6. Adicionar sugestões automáticas por normalização de texto, mantendo confirmação manual quando houver incerteza.

## Recomendação final

Sim, a **Unidade** deve ser usada como referência principal para verificar inadimplência, porque a obrigação associativa está ligada à casa/apartamento. O **CPF** deve continuar como filtro e identificador seguro do titular, mas não como único critério de quitação. O sistema deve preservar o nome do pagador do extrato e permitir criar aliases aprovados pela diretoria para que pagamentos futuros sejam reconhecidos corretamente.
