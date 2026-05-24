# Feedback Comunitário

O módulo de **Feedback Comunitário** é o canal permanente para que administradores, associados, moradores e visitantes reportem problemas, enviem sugestões, elogiem melhorias ou indiquem demandas operacionais. O MVP foi implementado com um botão global, formulário compacto, persistência Convex e painel administrativo de triagem, evitando complexidade excessiva antes de validar o uso real pela comunidade.

> O feedback deve estar disponível em todas as páginas, por meio de um ícone discreto no canto inferior direito. O MVP deve coletar URL, rota, timestamp e perfil do usuário automaticamente, mas não deve capturar screenshot automático.

## Objetivos do módulo

| Objetivo | Descrição |
|---|---|
| Escuta contínua | Criar um canal simples para a comunidade registrar percepções durante o uso real do sistema. |
| Priorização de produto | Transformar relatos recorrentes em insumos para roadmap e correções. |
| Suporte contextual | Registrar a página de origem e o perfil do usuário para facilitar diagnóstico. |
| Baixa fricção | Evitar formulários longos, anexos obrigatórios ou fluxos que impeçam o envio rápido. |
| Privacidade | Não capturar tela automaticamente e solicitar consentimento claro se screenshot for incluído no futuro. |

## Etapas aprovadas e status

| Etapa | Nome | Status | Escopo | Resultado esperado |
|---:|---|---|---|---|
| 1 | MVP global | Implementada | Botão flutuante, formulário compacto, categoria, mensagem, URL, timestamp, rota, perfil e persistência Convex. | Canal funcional de feedback em todas as páginas. |
| 2 | Painel administrativo | Implementada | Página `/admin/feedbacks` com listagem, filtros por status, status e detalhes de rota. | Diretoria consegue acompanhar e tratar registros. |
| 3 | Aprimoramento de UX | Implementada no MVP | Estados de carregamento, confirmação, tratamento de erro e microcopy clara. | Maior confiança no envio e menor abandono. |
| 4 | Screenshot opcional | Planejada | Captura manual com consentimento e pré-visualização antes de enviar. | Evidência visual quando o usuário desejar. |
| 5 | Inteligência de produto | Planejada | Classificação por recorrência, tags, prioridades e relatórios. | Feedbacks passam a orientar backlog e métricas. |
| 6 | Escalabilidade SaaS | Parcialmente preparada | `associationId`, filtros por cliente, isolamento lógico e exportações. | Módulo pronto para múltiplas associações. |

## MVP implementado

A primeira etapa foi implementada como componente global reutilizável, montado no layout principal para cobrir área pública, portal e painel administrativo. O botão fica no canto inferior direito, é perceptível sem competir com as ações principais da página e abre um modal compacto sem retirar o usuário do contexto atual.

| Campo | Origem | Obrigatório | Observação |
|---|---|---:|---|
| `associationId` | Sistema | Sim | No MVP AMRTS pode usar valor fixo ou configuração central, mas a tabela já deve nascer preparada para SaaS. |
| `category` | Usuário | Sim | Sugestão, problema, elogio, dúvida ou outro. |
| `message` | Usuário | Sim | Texto livre com limite razoável de caracteres. |
| `url` | Sistema | Sim | URL completa no momento do envio. |
| `route` | Sistema | Sim | Rota interna, como `/admin/transacoes` ou `/portal/inicio`. |
| `userRole` | Sessão | Recomendado | Papel do usuário quando autenticado: `sysadmin`, `diretoria`, `associado` ou `morador`. |
| `userId` | Sessão | Opcional | Deve ser registrado quando houver usuário autenticado. |
| `createdAt` | Sistema | Sim | Timestamp Unix em milissegundos. |
| `status` | Sistema/Admin | Sim | Valor inicial `novo`; depois pode evoluir para triagem. |
| `screenshotUrl` | Futuro | Não | Fora do MVP; somente com consentimento explícito. |

## Fluxo de envio

| Passo | Comportamento esperado |
|---:|---|
| 1 | Usuário clica no botão flutuante de feedback. |
| 2 | Sistema abre modal ou painel compacto sem sair da página atual. |
| 3 | Usuário escolhe categoria e escreve a mensagem. |
| 4 | Sistema acrescenta automaticamente URL, rota, timestamp e contexto de sessão. |
| 5 | Mutação Convex grava o registro na tabela `feedbacks`. |
| 6 | Interface mostra confirmação clara e fecha ou limpa o formulário. |
| 7 | Em caso de erro, a mensagem deve preservar o texto digitado e orientar nova tentativa. |

## Painel administrativo implementado

A rota `/admin/feedbacks` permite que a diretoria acompanhe a fila de feedbacks. A visualização inicial prioriza simplicidade e triagem rápida, sem transformar o módulo em um sistema de chamados complexo antes da validação de uso.

| Recurso | Prioridade | Descrição |
|---|---:|---|
| Listagem cronológica | Alta | Feedbacks mais recentes no topo. |
| Filtros por status e categoria | Alta | Permite separar problemas, sugestões e elogios. |
| Detalhe do registro | Alta | Mostra mensagem, rota, usuário, data e metadados. |
| Alteração de status | Alta | `novo`, `em_analise`, `resolvido`, `arquivado`. |
| Tags e prioridade | Média | Suporte à etapa de inteligência de produto. |
| Exportação | Baixa | Útil para prestação de contas e análise externa. |

## Política para screenshots

Screenshot automático foi descartado no MVP por simplicidade e privacidade. Em etapa futura, a captura visual deve ser opcional, acionada pelo usuário, acompanhada de explicação clara e preferencialmente com pré-visualização antes do envio.

| Regra | Justificativa |
|---|---|
| Não capturar automaticamente | Evita coletar dados pessoais ou financeiros sem intenção explícita. |
| Solicitar consentimento | Deixa claro o que será enviado e por quê. |
| Permitir pré-visualização | Usuário pode cancelar caso a imagem exponha dados sensíveis. |
| Armazenar com `associationId` | Mantém rastreabilidade e isolamento no modelo SaaS. |

## Contratos técnicos implementados

| Item | Proposta |
|---|---|
| Tabela Convex | `feedbacks`. |
| Mutação de criação | `feedbacks:createFeedback`. |
| Query administrativa | `feedbacks:listFeedbacks`. |
| Mutação de status | `feedbacks:updateFeedbackStatus`. |
| Rota administrativa | `/admin/feedbacks`. |
| Componente global | `CommunityFeedbackButton` ou nome equivalente. |

## Referências internas

[1]: registro-decisoes.md "Registro de decisões do produto"
[2]: schema-banco.md "Schema do banco de dados"
[3]: roadmap.md "Roadmap do produto"
