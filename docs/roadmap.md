# Roadmap do Produto Santorini

O roadmap organiza a evolução do Santorini como dashboard financeiro, gerencial e comunitário para a AMRTS, com preparação gradual para operação SaaS multiassociação. Ele consolida entregas já realizadas, decisões recentes e próximas etapas aprovadas.

## Visão por fases

| Fase | Tema | Estado | Resultado |
|---:|---|---:|---|
| 1 | Base financeira e associados | Concluída | Importação de transações, associados e indicadores iniciais. |
| 2 | Comunicação e governança | Concluída | Comunicados, documentos, assembleias e organização institucional. |
| 3 | Operações, portal e privacidade | Em evolução | Portal, usuários, permissões, reservas, manutenção e módulos operacionais. |
| 4 | UX, identidade e sessão | Implementada em parte | Logo AMRTS, favicon, toggles pill e melhoria de persistência de sessão. |
| 5 | Feedback Comunitário | Aprovada para implementação | Canal global de escuta com painel administrativo. |
| 6 | SaaS multiassociação | Planejada | Isolamento por `associationId`, parametrização de marca e planos. |

## Entregas recentes registradas

| Entrega | Estado | Documentação relacionada |
|---|---:|---|
| Logo oficial AMRTS aplicada em menus e ícones | Implementada | [Identidade visual](identidade-visual.md). |
| Favicon, Apple Touch Icon e variações de logo | Implementada | [Identidade visual](identidade-visual.md). |
| Toggles Wide/Boxed em formato pill na topbar desktop | Implementada | [Identidade visual](identidade-visual.md). |
| Persistência de sessão administrativa na versão estática | Implementada | [Portal do Associado](portal-do-associado.md). |
| Login com redirecionamento automático quando já autenticado | Implementada | [Portal do Associado](portal-do-associado.md). |
| Modelo comercial de assinatura mensal | Aprovado | [Modelo de negócio SaaS](modelo-negocio.md). |
| Plano de Feedback Comunitário em seis etapas | Aprovado | [Feedback Comunitário](feedback-comunitario.md). |

## Próxima prioridade: Feedback Comunitário

A próxima implementação recomendada é a Etapa 1 do Feedback Comunitário. O MVP deve ser pequeno, rastreável e global, com persistência no Convex e base de dados preparada para multiassociação.

| Item | Escopo mínimo |
|---|---|
| Componente global | Botão flutuante no canto inferior direito em todas as páginas. |
| Formulário | Categoria e mensagem. |
| Contexto automático | URL, rota, timestamp e perfil do usuário. |
| Persistência | Tabela `feedbacks` com `associationId`. |
| Resposta ao usuário | Confirmação de envio e tratamento de erro. |
| Administração | Rota futura `/admin/feedbacks`. |

## Backlog priorizado

| Prioridade | Item | Justificativa |
|---:|---|---|
| Alta | Implementar MVP de Feedback Comunitário | Cria canal de escuta e insumo para priorização. |
| Alta | Criar painel administrativo de feedbacks | Sem triagem, os registros perdem valor operacional. |
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
