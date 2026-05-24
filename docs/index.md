# Documentação do App Santorini

**Projeto:** AMRTS Santorini — Dashboard de gestão residencial e financeira
**Cliente inicial:** Associação de Moradores do Residencial Terra de Santorini (AMRTS)
**Modelo de produto:** SaaS por assinatura mensal, com Plano Básico de US$20/mês
**Repositório:** [zionsti/santorini](https://github.com/zionsti/santorini)
**Versão pública estática:** [zionsti.github.io/santorini](https://zionsti.github.io/santorini/)
**Última atualização documental:** 2026-05-23

Esta pasta reúne a documentação oficial do app Santorini. O objetivo é manter, em um único ponto do repositório, a memória técnica, operacional e estratégica do produto, incluindo decisões recentes de UX, identidade visual, modelo SaaS, portal do associado, evolução do módulo de **Feedback Comunitário** e estratégia de **Tutoriais Inteligentes por role**.

> A documentação deve ser tratada como parte do produto. Sempre que uma decisão funcional, comercial, técnica ou operacional for aprovada, ela deve ser registrada nesta pasta antes ou junto da implementação correspondente.

## Mapa da documentação

| Documento | Público principal | Finalidade |
|---|---|---|
| [Visão geral e índice](index.md) | Diretoria, produto e desenvolvimento | Ponto de entrada para toda a documentação do app. |
| [Registro de decisões do produto](registro-decisoes.md) | Produto, diretoria e desenvolvimento | Consolida decisões aprovadas, motivação e impacto esperado. |
| [Modelo de negócio SaaS](modelo-negocio.md) | Diretoria, comercial e produto | Documenta assinatura mensal, Plano Básico, multiassociação e premissas comerciais. |
| [Roadmap](roadmap.md) | Todos os envolvidos | Organiza entregas concluídas, próximas fases e backlog priorizado. |
| [Feedback Comunitário](feedback-comunitario.md) | Produto, UX e desenvolvimento | Documenta o módulo global de feedback, o MVP implementado e as próximas etapas. |
| [Tutoriais do usuário](tutoriais-usuario.md) | Produto, UX, suporte e usuários finais | Documenta e registra o MVP in-app da Trilha Viva Santorini, com instruções por role, rota e menu permitido. |
| [Portal do Associado](portal-do-associado.md) | Produto, suporte e desenvolvimento | Define a experiência dedicada do associado, substituindo o uso de modal como solução principal. |
| [Identidade visual](identidade-visual.md) | Produto, design e desenvolvimento | Registra uso da logo AMRTS, favicons, ícones e aplicação nos menus. |
| [Arquitetura técnica](arquitetura.md) | Desenvolvimento | Explica a arquitetura Next.js, Convex, versão estática e estratégia de evolução. |
| [API Backend Convex](api-backend.md) | Desenvolvimento | Referência das principais funções serverless e contratos de chamada. |
| [Schema do banco](schema-banco.md) | Desenvolvimento | Documenta tabelas atuais, índices e tabelas planejadas. |
| [Guia do usuário](guia-usuario.md) | Administração e associados | Explica uso dos principais módulos do sistema. |
| [Operações e deploy](operacoes.md) | Administração técnica e DevOps | Registra rotinas de deploy, sincronização, backup e validação. |
| [Solução de problemas](troubleshooting.md) | Suporte e desenvolvimento | Centraliza sintomas, causas prováveis e procedimentos de diagnóstico. |

## Estado atual do produto

| Área | Estado documentado | Observação |
|---|---:|---|
| Versão estática no GitHub Pages | Em produção | Mantida como publicação pública e referência operacional. |
| Aplicação Next.js | Em evolução ativa | Estrutura com rotas públicas, administrativas e portal do associado. |
| Backend Convex | Em uso | Responsável por persistência e funções serverless. |
| Identidade visual AMRTS | Implementada | Logo oficial aplicada como favicon, Apple Touch Icon e marca nos menus. |
| Sessão administrativa | Melhorada | Usuário autenticado não deve ser solicitado a logar novamente ao retornar à página inicial. |
| Toggles Wide/Boxed | Implementados na topbar desktop | Padrão visual em formato pill. |
| Feedback Comunitário | MVP implementado | Botão global, persistência Convex e painel `/admin/feedbacks`. |
| Tutoriais Inteligentes por role | Persistência e painel implementados | Trilha Viva Santorini integrada ao portal do associado com progresso Convex, fallback local e painel `/admin/trilha-viva`. |
| Modelo SaaS multiassociação | Planejado | Estrutura documental considera `associationId` e escalabilidade para novas associações. |

## Convenções de manutenção documental

A documentação deve permanecer objetiva, rastreável e versionada. Novos módulos devem receber pelo menos um documento funcional, um registro de decisão quando alterarem produto ou UX, e atualização do roadmap. Mudanças de banco, API, autenticação, deploy ou segurança precisam ser refletidas nos documentos técnicos antes do fechamento da tarefa.

| Tipo de alteração | Documentos a revisar |
|---|---|
| Nova funcionalidade de usuário | `roadmap.md`, documento funcional específico, `guia-usuario.md` e, quando houver impacto instrucional, `tutoriais-usuario.md`. |
| Nova tabela ou alteração Convex | `schema-banco.md`, `api-backend.md` e `arquitetura.md`, quando impactar fluxo. |
| Decisão comercial | `modelo-negocio.md` e `registro-decisoes.md`. |
| Alteração visual ou de marca | `identidade-visual.md` e documentos de UX relacionados. |
| Deploy, CI/CD ou ambiente | `operacoes.md`, `troubleshooting.md` e `DEPLOY.md`, se aplicável. |

## Referências internas

[1]: ../README.md "README principal do repositório"
[2]: ../ROADMAP.md "Roadmap raiz do repositório"
[3]: ../CHANGELOG.md "Changelog do projeto"
[4]: ../DEPLOY.md "Guia de deploy do projeto"
