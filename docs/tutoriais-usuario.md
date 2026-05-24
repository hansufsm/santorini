# Tutoriais do Usuário — Trilha Viva Santorini

A **Trilha Viva Santorini** é a estratégia instrucional do app para que cada usuário entenda o sistema de forma natural, contextual e progressiva. A documentação não deve ser apenas um manual externo. Ela deve funcionar como uma camada de aprendizagem integrada ao produto, capaz de explicar **para que serve** cada funcionalidade, **o que o usuário pode ou deve fazer** em cada área e **como executar** as ações permitidas pela sua role.

> A experiência ideal é que o usuário nunca se sinta “perdido no menu”. Cada tela deve responder, em poucos segundos, três perguntas: **onde estou**, **o que posso resolver aqui** e **qual é o próximo passo seguro**.

## Status da implementação

A versão in-app da Trilha Viva foi implementada no portal do associado e evoluiu para persistência remota no Convex. O app possui uma base estruturada de conteúdo em `lib/trilha-viva-content.ts`, um componente contextual reutilizável em `components/trilha-viva-guide.tsx`, integração direta no layout `app/portal/layout.tsx`, tabela `trilhaVivaProgress` no schema Convex e painel administrativo em `/admin/trilha-viva`. O card aparece nas principais rotas do portal e combina missão da tela, ações orientadas, checklist de conclusão sincronizado, fallback local e próximo passo recomendado.

| Item | Status | Observação |
|---|---|---|
| Conteúdo por rota do portal | Implementado | Cobre Início, Extrato, Mensalidade, Meu Cadastro, Reservas, Comunicados e Suporte. |
| Segmentação por role | Implementado no MVP | A estrutura aceita roles e o portal usa o papel da sessão para exibir conteúdo compatível. |
| Card contextual “Como usar esta tela” | Implementado | O usuário aprende sem sair da rota atual. |
| Checklist por rota e role | Implementado | O progresso é sincronizado no Convex por usuário, rota e papel; quando a conexão remota falha, o navegador mantém fallback em `localStorage`. |
| Painel administrativo `/admin/trilha-viva` | Implementado | Diretoria e sysadmin acompanham registros, status, perfis e pontos de dificuldade por menu. |
| Integração com Feedback Comunitário | Planejada para evolução | O MVP já convive com o botão global de feedback; a conexão direta “esta orientação ajudou?” será a próxima etapa. |

## Princípio de experiência

A técnica proposta combina documentação, onboarding e feedback contínuo. Em vez de criar um único tutorial longo, o Santorini deve oferecer microinstruções conectadas ao contexto de uso. Assim, o usuário aprende no momento em que a dúvida aparece, sem abandonar a tela em que está trabalhando.

| Pilar | Aplicação prática | Efeito esperado |
|---|---|---|
| Ensino por role | O conteúdo muda conforme `morador`, `associado`, `diretoria` ou `sysadmin`. | O usuário não recebe instruções de áreas que não pode acessar. |
| Ensino por menu | Cada item do menu possui finalidade, ações possíveis, cuidados e passo a passo. | O menu deixa de ser apenas navegação e vira mapa de trabalho. |
| Ensino por missão | Cada tela começa com uma frase de missão curta e acionável. | O usuário entende imediatamente o valor daquela área. |
| Ensino em camadas | Primeiro aparece a orientação curta; depois, detalhes sob demanda. | O app não fica poluído, mas continua completo para quem precisa. |
| Feedback acoplado | Ao final do tutorial, o usuário pode dizer se a instrução ajudou. | A documentação evolui a partir das dúvidas reais da comunidade. |

## Modelo instrucional “Missão, Ação, Confirmação”

A técnica principal da Trilha Viva é o modelo **Missão, Ação, Confirmação**. Cada funcionalidade deve ser explicada com uma narrativa curta: primeiro o sistema apresenta a missão da tela; depois mostra as ações permitidas; por fim ensina como confirmar que a tarefa foi concluída corretamente.

| Etapa | Pergunta respondida | Exemplo de aplicação |
|---|---|---|
| Missão | Para que serve esta tela? | “Aqui você acompanha sua mensalidade e entende se há pendências.” |
| Ação | O que posso ou devo fazer aqui? | “Confira o mês atual, veja valores e procure a diretoria se houver divergência.” |
| Como fazer | Quais passos devo seguir? | “Abra Mensalidade, confira o status, compare com o Extrato e use Suporte se precisar.” |
| Confirmação | Como sei que deu certo? | “O status aparece como em dia, a transação consta no extrato ou o chamado foi aberto.” |
| Próximo passo | Para onde vou depois? | “Se estiver tudo certo, consulte Comunicados ou faça uma Reserva.” |

## Arquitetura da ajuda dentro do app

A implementação atual criou uma camada de ajuda reutilizável por rota para o portal. Cada tela declara seus tutoriais em uma estrutura simples, permitindo que o frontend apresente um card “Como usar esta tela” com missão, ações, passos, confirmação e próximo passo. Em evoluções futuras, essa mesma base poderá acionar destaques visuais de botões e campos importantes.

| Componente | Descrição | Status |
|---|---|---|
| `TrilhaVivaGuideCard` | Card discreto de ajuda contextual dentro da área principal do portal. | Implementado |
| `trilhaVivaGuides` | Registro técnico que relaciona rota, role, título, passos e permissões. | Implementado |
| Checklist contextual | Lista de ações concluíveis pelo usuário, com persistência remota em `trilhaVivaProgress` e fallback local por rota e role. | Implementado |
| `trilhaViva.ts` | Queries e mutations Convex para abrir, concluir, reiniciar e acompanhar progresso. | Implementado |
| Painel administrativo `/admin/trilha-viva` | Visão de métricas, filtros por status/perfil/menu e pontos de dificuldade. | Implementado |
| `TutorialFeedback` | Pergunta final: “Esta orientação ajudou?” integrada ao Feedback Comunitário. | Próxima evolução |
| `GuidedSpotlight` | Destaque visual opcional de botões e campos importantes. | Futuro |
| Painel lateral/drawer | Versão expandida do guia para fluxos longos. | Futuro |

## Mapa por role

O Santorini deve respeitar a diferença entre quem consome informações, quem participa como associado, quem administra a associação e quem sustenta tecnicamente o sistema. A documentação abaixo organiza a experiência inicial de cada perfil.

| Role | Objetivo da orientação | Tom da instrução | Profundidade |
|---|---|---|---|
| Morador | Ajudar a encontrar informações essenciais e abrir suporte. | Simples, direto e acolhedor. | Curta, com foco em navegação. |
| Associado | Ensinar acompanhamento financeiro, cadastro, reservas e comunicação. | Prático, transparente e orientado a autonomia. | Intermediária, com passos claros. |
| Diretoria | Ensinar operação, triagem, governança e manutenção dos dados. | Gerencial, preciso e rastreável. | Completa, com cuidados e critérios. |
| Sysadmin | Ensinar segurança, usuários, permissões e sustentação técnica. | Técnico, preventivo e responsável. | Completa, com alertas de risco. |

## Tutorial do Associado

O menu do associado deve ser o primeiro roteiro instrucional completo, porque é a experiência mais visível para a comunidade. A navegação típica contém **Início**, **Extrato**, **Mensalidade**, **Meu Cadastro**, **Reservas**, **Comunicados** e **Suporte**.

| Menu | Para que serve | O que pode ou deve fazer | Como fazer | Confirmação de sucesso |
|---|---|---|---|---|
| Início | Apresentar um resumo da situação do associado. | Verificar pendências, avisos recentes e atalhos importantes. | Acesse o menu Início e leia os cards principais antes de navegar para áreas específicas. | O usuário entende sua situação geral sem precisar abrir várias telas. |
| Extrato | Consultar movimentações financeiras relacionadas à unidade ou associação. | Conferir pagamentos, lançamentos e histórico financeiro. | Abra Extrato, revise datas, descrições e valores; use filtros quando disponíveis. | O lançamento esperado aparece com data, descrição e valor coerentes. |
| Mensalidade | Acompanhar a contribuição mensal e eventual pendência. | Verificar se está em dia e identificar necessidade de regularização. | Abra Mensalidade, confira mês corrente, status e valor; compare com Extrato se houver dúvida. | O status financeiro do mês está claro para o associado. |
| Meu Cadastro | Visualizar e manter dados de contato atualizados. | Conferir nome, unidade, e-mail e telefone; atualizar campos permitidos. | Acesse Meu Cadastro, edite os campos liberados e salve. | O app exibe mensagem de sucesso e os dados atualizados permanecem visíveis. |
| Reservas | Solicitar ou acompanhar reserva de áreas comuns. | Ver disponibilidade, registrar interesse e acompanhar status. | Abra Reservas, escolha área/data quando disponível e envie a solicitação. | A reserva aparece registrada ou o sistema informa impedimento claramente. |
| Comunicados | Ler avisos oficiais da associação. | Acompanhar comunicados, regras, convocações e alertas. | Abra Comunicados e leia os itens recentes; priorize comunicados fixados ou urgentes. | O associado sabe qual informação é oficial e atual. |
| Suporte | Pedir ajuda, reportar problema ou acompanhar chamado. | Abrir chamados de manutenção, dúvida ou suporte operacional. | Abra Suporte, descreva a situação, selecione prioridade quando existir e envie. | O chamado aparece no histórico com status inicial. |

### Roteiro de primeira visita do Associado

Na primeira entrada, o app deve conduzir o associado por um roteiro curto e amigável. O usuário não precisa decorar o sistema; ele precisa completar uma pequena sequência de reconhecimento.

| Passo | Mensagem sugerida | Ação esperada |
|---:|---|---|
| 1 | “Comece pelo Início: aqui está o resumo da sua vida no Santorini.” | Ler cards e atalhos. |
| 2 | “Confira seu Extrato para reconhecer os lançamentos financeiros.” | Abrir Extrato e revisar movimentações. |
| 3 | “Veja Mensalidade para entender seu status do mês.” | Confirmar se está em dia ou pendente. |
| 4 | “Atualize Meu Cadastro para a associação falar com você corretamente.” | Conferir e-mail e telefone. |
| 5 | “Use Comunicados para acompanhar informações oficiais.” | Ler comunicados recentes. |
| 6 | “Se algo estiver errado, use Suporte ou Feedback.” | Abrir chamado ou enviar feedback contextual. |

## Tutorial do Morador

O morador deve receber uma experiência mais enxuta. Ele pode não ter acesso a todas as informações financeiras de associado, mas precisa compreender comunicados, orientações e canais de suporte.

| Menu | Para que serve | O que pode ou deve fazer | Como fazer | Confirmação de sucesso |
|---|---|---|---|---|
| Início | Mostrar informações essenciais do residencial. | Ler avisos, atalhos e orientações básicas. | Acesse Início e verifique cards de comunicação. | O morador sabe quais informações exigem atenção. |
| Comunicados | Consultar mensagens oficiais. | Ler regras, avisos e convocações permitidas. | Abra Comunicados e priorize itens recentes ou destacados. | O morador entende o aviso e sabe se há ação necessária. |
| Suporte | Solicitar ajuda ou reportar problema. | Registrar demandas de manutenção, dúvida ou atendimento. | Abra Suporte, descreva a situação com clareza e envie. | O chamado aparece com status de abertura. |

## Tutorial da Diretoria

A diretoria precisa de orientação operacional e critérios de decisão. As instruções devem explicar não apenas onde clicar, mas também quais cuidados tomar para manter dados confiáveis, comunicação transparente e governança adequada.

| Menu | Para que serve | O que pode ou deve fazer | Como fazer | Cuidados de governança |
|---|---|---|---|---|
| Dashboard | Acompanhar indicadores e visão geral da associação. | Observar receitas, despesas, saldo, associados e alertas. | Entrar no painel administrativo e revisar KPIs antes de ações operacionais. | Não tomar decisões apenas por um indicador isolado. |
| Transações | Gerenciar lançamentos financeiros. | Registrar, revisar e classificar movimentações. | Abrir Transações, conferir dados, usar filtros e manter descrições claras. | Evitar duplicidade e preservar rastreabilidade. |
| Associados | Administrar cadastro e status de associados. | Verificar dados, status e vínculo com unidade. | Abrir Associados, pesquisar pessoa ou unidade e atualizar apenas quando houver base. | Proteger dados pessoais e evitar alterações sem justificativa. |
| Reservas | Gerenciar solicitações de áreas comuns. | Aprovar, acompanhar ou revisar reservas. | Abrir Reservas, verificar data, área, solicitante e conflitos. | Aplicar regras de forma uniforme. |
| Comunicados | Publicar informações oficiais. | Criar avisos claros, objetivos e úteis. | Abrir Comunicados, escolher tipo, escrever mensagem e publicar. | Diferenciar informação oficial de conversa informal. |
| Manutenção | Triar chamados de suporte e manutenção. | Atualizar status, priorizar urgências e registrar andamento. | Abrir Manutenção, revisar chamados abertos e mudar status conforme execução. | Não encerrar chamado sem resolução ou justificativa. |
| Feedbacks | Transformar percepções dos usuários em melhorias. | Classificar feedbacks, identificar padrões e priorizar ajustes. | Abrir Feedbacks, filtrar por status/categoria e atualizar triagem. | Usar feedback como insumo de produto, não como atendimento isolado. |

## Tutorial do Sysadmin

O sysadmin possui a maior responsabilidade operacional. A instrução deve enfatizar segurança, permissões, prevenção de erro e sustentação técnica do ambiente.

| Menu | Para que serve | O que pode ou deve fazer | Como fazer | Risco principal |
|---|---|---|---|---|
| Usuários | Controlar acesso ao sistema. | Criar, ativar, inativar e revisar papéis. | Abrir Usuários, conferir dados, definir role correta e salvar. | Conceder permissão excessiva. |
| Painel Admin | Operar com visão de diretoria quando necessário. | Apoiar diagnósticos e validar funcionamento. | Navegar pelas áreas administrativas com foco em suporte. | Alterar dados operacionais sem demanda. |
| Deploy e Operações | Sustentar ambiente, banco e publicação. | Validar build, Convex, variáveis e versionamento. | Seguir `docs/operacoes.md` antes de publicar. | Publicar sem validação ou perder rastreabilidade. |
| Feedbacks | Monitorar qualidade do produto e sinais de erro. | Separar bug técnico, dúvida de uso e sugestão. | Filtrar feedbacks e cruzar com rotas afetadas. | Ignorar padrões recorrentes reportados pelos usuários. |

## Padrão de conteúdo por tela

Cada tela nova ou existente deve receber um bloco instrucional padronizado. Esse bloco poderá viver inicialmente na documentação e, depois, ser convertido em dados consumidos pelo componente de ajuda contextual.

| Campo | Descrição | Exemplo |
|---|---|---|
| `title` | Nome humano da tela. | “Mensalidade” |
| `route` | Rota onde o tutorial aparece. | `/portal/mensalidade` |
| `roles` | Perfis autorizados. | `associado`, `diretoria` |
| `mission` | Frase curta sobre a finalidade. | “Entenda sua situação mensal.” |
| `allowedActions` | Ações que o usuário pode executar. | “Consultar status, comparar com extrato, pedir suporte.” |
| `steps` | Passos de uso. | “Abra a tela, confira o mês, revise o valor.” |
| `successSignal` | Como confirmar que deu certo. | “Status claro e valor correspondente ao extrato.” |
| `commonDoubts` | Dúvidas frequentes da tela. | “Por que meu pagamento ainda não aparece?” |
| `feedbackPrompt` | Pergunta final para melhorar a ajuda. | “Esta explicação resolveu sua dúvida?” |

## Microcopy sugerida para a interface

A interface deve utilizar frases curtas, humanas e orientadas à ação. Abaixo estão exemplos de textos que podem aparecer no painel de ajuda contextual.

| Contexto | Texto sugerido |
|---|---|
| Botão global de ajuda | “Como usar esta tela” |
| Abertura do painel | “Vamos resolver isso juntos em poucos passos.” |
| Primeiro acesso | “Esta é sua primeira visita nesta área. Quer um guia rápido?” |
| Final de tutorial | “Agora você sabe o que esta tela faz. Deseja enviar uma dúvida ou sugestão?” |
| Sem permissão | “Esta funcionalidade não está disponível para sua role atual.” |
| Dúvida financeira | “Compare primeiro com o Extrato; se a divergência continuar, abra Suporte.” |
| Chamada para feedback | “A explicação pode melhorar? Envie um feedback desta tela.” |

## Métricas de sucesso

A Trilha Viva deve ser avaliada por indicadores simples, pois o objetivo é reduzir fricção e aumentar autonomia. A medição inicial pode ser feita com dados do Feedback Comunitário e observações da diretoria.

| Métrica | Sinal positivo | Fonte inicial |
|---|---|---|
| Redução de dúvidas repetidas | Menos chamados sobre “onde encontro” ou “como faço”. | Suporte e Feedback Comunitário. |
| Conclusão de primeira visita | Usuário passa pelos menus essenciais sem pedir ajuda. | `trilhaVivaProgress` e painel `/admin/trilha-viva`. |
| Clareza por tela | Feedbacks indicam que a instrução ajudou. | Feedback Comunitário e futura integração `TutorialFeedback`. |
| Qualidade dos chamados | Mensagens de suporte ficam mais completas e objetivas. | Módulo Suporte. |
| Adoção do portal | Associados acessam mais Extrato, Mensalidade e Comunicados. | Métricas futuras de uso. |

## Plano de implementação

A implementação é gradual e já saiu da fase puramente documental. O portal do associado recebeu a primeira camada viva de orientação contextual, enquanto as próximas etapas devem transformar feedback, métricas de uso e destaques visuais em uma experiência ainda mais inteligente.

| Etapa | Entrega | Status |
|---:|---|---|
| 1 | Documentar menus por role. | Concluída |
| 2 | Criar registro técnico de tutoriais. | Concluída em `lib/trilha-viva-content.ts` |
| 3 | Implementar card “Como usar esta tela”. | Concluída em `components/trilha-viva-guide.tsx` |
| 4 | Integrar o card às rotas do portal. | Concluída em `app/portal/layout.tsx` |
| 5 | Persistir progresso da Trilha Viva no Convex por usuário, rota e role. | Concluída em `convex/trilhaViva.ts` e `trilhaVivaProgress` |
| 6 | Criar painel administrativo de acompanhamento da Trilha Viva. | Concluída em `/admin/trilha-viva` |
| 7 | Integrar diretamente com Feedback Comunitário. | Próxima evolução |
| 8 | Medir dúvidas recorrentes e ajustar conteúdo. | Em evolução |

## Decisão de produto

Fica registrado que a documentação de usuário do Santorini deve evoluir para uma experiência viva, contextual e segmentada por permissão. A prioridade inicial é o roteiro do **Associado**, porque ele concentra os menus visíveis no portal comunitário e representa a jornada mais importante de adoção: consultar informações, entender mensalidade, manter cadastro, acompanhar reservas, ler comunicados e pedir suporte.

## Referências internas

[1]: roadmap.md "Roadmap do Produto Santorini"
[2]: guia-usuario.md "Guia do Usuário"
[3]: feedback-comunitario.md "Feedback Comunitário"
[4]: portal-do-associado.md "Portal do Associado"
