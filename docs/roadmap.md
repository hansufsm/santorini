# Roadmap do Produto Santorini

O roadmap organiza a evolução do Santorini como dashboard financeiro, gerencial e comunitário para a AMRTS, com preparação gradual para operação SaaS multiassociação. Ele consolida entregas já realizadas, decisões recentes e próximas etapas aprovadas.

## Visão por fases

| Fase | Tema | Estado | Resultado |
|---:|---|---:|---|
| 1 | Base financeira e associados | Concluída | Importação de transações, associados e indicadores iniciais. |
| 2 | Comunicação e governança | Concluída | Comunicados, documentos, assembleias e organização institucional. |
| 3 | Operações, portal e privacidade | Em evolução | Portal, usuários, permissões, reservas, manutenção e módulos operacionais. |
| 4 | UX, identidade e sessão | Implementada em parte | Logo AMRTS, favicon, toggles pill e melhoria de persistência de sessão. |
| 5 | Feedback Comunitário | MVP implementado | Canal global de escuta com painel administrativo. |
| 6 | Tutoriais inteligentes por role | MVP in-app implementado | Trilha Viva contextual no portal, com conteúdo por rota, role e checklist local. |
| 7 | SaaS multiassociação | Planejada | Isolamento por `associationId`, parametrização de marca e planos. |

## Entregas recentes registradas

| Entrega | Estado | Documentação relacionada |
|---|---:|---|
| Logo oficial AMRTS aplicada em menus e ícones | Implementada | [Identidade visual](identidade-visual.md). |
| Favicon, Apple Touch Icon e variações de logo | Implementada | [Identidade visual](identidade-visual.md). |
| Toggles Wide/Boxed em formato pill na topbar desktop | Implementada | [Identidade visual](identidade-visual.md). |
| Persistência de sessão administrativa na versão estática | Implementada | [Portal do Associado](portal-do-associado.md). |
| Login com redirecionamento automático quando já autenticado | Implementada | [Portal do Associado](portal-do-associado.md). |
| Modelo comercial de assinatura mensal | Aprovado | [Modelo de negócio SaaS](modelo-negocio.md). |
| MVP de Feedback Comunitário com painel de triagem | Implementado | [Feedback Comunitário](feedback-comunitario.md). |
| MVP da Trilha Viva no portal do associado | Implementado | [Tutoriais do usuário](tutoriais-usuario.md). |

## Entrega implementada: Feedback Comunitário

O MVP de Feedback Comunitário foi implementado como canal pequeno, rastreável e global, com persistência no Convex e base de dados preparada para multiassociação. A próxima evolução deve observar o uso real, medir recorrência dos relatos e decidir quando incluir screenshot opcional com consentimento.

| Item | Escopo implementado |
|---|---|
| Componente global | Botão flutuante no canto inferior direito em todas as páginas. |
| Formulário | Categoria e mensagem. |
| Contexto automático | URL, rota, timestamp e perfil do usuário quando autenticado. |
| Persistência | Tabela `feedbacks` com `associationId`. |
| Resposta ao usuário | Confirmação de envio, carregamento e tratamento de erro. |
| Administração | Rota `/admin/feedbacks` com filtros e alteração de status. |

## Entrega implementada: Tutoriais Inteligentes por role

A primeira camada de experiência da **Trilha Viva Santorini** foi implementada no portal do associado. O sistema agora ensina enquanto o usuário trabalha, com um card contextual que aparece dentro das rotas do portal e explica missão, ações, passos, confirmação e próximo destino. A meta permanece evoluir essa base para que associado, morador, diretoria ou sysadmin entendam imediatamente **para que serve** cada funcionalidade, **o que podem ou devem fazer** e **como executar** as ações principais.

> A técnica proposta recebe o nome de **Trilha Viva Santorini**: uma combinação de manual por role, cards de missão, microtutorial contextual, checklist de primeira execução e canal de feedback na própria tela. A experiência deve parecer um guia de bordo do condomínio, não um arquivo de ajuda isolado.

| Camada instrucional | Como funciona | Resultado esperado |
|---|---|---|
| Manual por role | Documentação separada por `morador`, `associado`, `diretoria` e `sysadmin`. | O usuário vê apenas o que faz sentido para seu nível de permissão. |
| Mapa do menu | Cada item de menu descreve objetivo, permissões, ações recomendadas e limites. | Reduz dúvidas sobre onde clicar e por que cada área existe. |
| Cards de missão | Cada tela ganha uma pequena narrativa: “sua missão aqui é…”. | Aumenta autonomia e sensação de progresso. |
| Microtutorial contextual | Card contextual abre passos curtos dentro da própria tela. | Implementado no portal do associado. |
| Checklist de primeira vez | Cada rota possui ações marcáveis, persistidas no navegador por role e rota. | Implementado no portal do associado. |
| Feedback acoplado | Ao final de cada tutorial, o usuário poderá enviar dúvida ou sugestão. | Próxima evolução integrada ao Feedback Comunitário. |

| Role | Menus prioritários para instrução inicial | Foco pedagógico |
|---|---|---|
| Morador | Início, Comunicados, Suporte | Entender informações essenciais e saber pedir ajuda. |
| Associado | Início, Extrato, Mensalidade, Meu Cadastro, Reservas, Comunicados, Suporte | Acompanhar situação financeira, manter cadastro e consumir serviços. |
| Diretoria | Dashboard, Transações, Associados, Reservas, Comunicados, Manutenção, Feedbacks | Operar a associação, responder demandas e manter governança. |
| Sysadmin | Todos os itens da diretoria, Usuários e parâmetros técnicos | Garantir segurança, permissões e sustentação do sistema. |

## Backlog priorizado

| Prioridade | Item | Justificativa |
|---:|---|---|
| Concluída | Implementar MVP de Feedback Comunitário | Cria canal de escuta e insumo para priorização. |
| Concluída | Criar painel administrativo de feedbacks | Sem triagem, os registros perdem valor operacional. |
| Concluída | Criar documentação instrucional por role e menu | Transforma o app em uma experiência guiada e reduz suporte manual. |
| Concluída | Implementar microtutorial in-app “Trilha Viva Santorini” no portal | Leva a instrução para dentro das telas, conectada ao papel do usuário. |
| Alta | Consolidar Portal do Associado como área dedicada | Aumenta valor percebido pelos moradores e reduz suporte manual. |
| Média | Evoluir gestor de patrimônio | Organiza bens comuns e manutenção. |
| Média | Estruturar divulgação de serviços | Cria utilidade comunitária e engajamento. |
| Média | Preparar `associationId` nas novas tabelas | Reduz retrabalho na expansão SaaS. |
| Baixa | Screenshot opcional no feedback | Deve vir somente após validar uso do MVP. |
| Baixa | PWA e notificações | Úteis, mas dependem de base funcional estável. |

## Critérios de priorização

As próximas entregas devem ser priorizadas por impacto comunitário, redução de trabalho manual da diretoria, risco técnico, valor comercial para futuras associações e capacidade de demonstrar evolução contínua no plano de assinatura.

| Critério | Pergunta orientadora |
|---|---|
| Valor para associado | A funcionalidade aumenta transparência ou utilidade cotidiana? |
| Valor para diretoria | Reduz planilhas, retrabalho, dúvidas ou atendimento manual? |
| Escala SaaS | Pode ser reutilizada por outras associações com pouca adaptação? |
| Risco | Exige alteração sensível em banco, autenticação ou privacidade? |
| Mensurabilidade | Gera dados que ajudam a decidir os próximos passos? |

## Relação com documentação raiz

O arquivo `ROADMAP.md` na raiz pode continuar funcionando como resumo executivo ou histórico de fases. Este documento em `docs/roadmap.md` deve ser a referência detalhada para produto, pois está ligado aos demais documentos funcionais e técnicos da pasta `docs`.

## Referências internas

[1]: feedback-comunitario.md "Feedback Comunitário"
[2]: modelo-negocio.md "Modelo de negócio SaaS"
[3]: registro-decisoes.md "Registro de decisões do produto"
[4]: tutoriais-usuario.md "Tutoriais do usuário"
