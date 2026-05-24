# Registro de Decisões do Produto

Este documento registra decisões aprovadas para o app Santorini e deve ser usado como memória de produto. Ele complementa o roadmap, pois explica **o que foi decidido**, **por que foi decidido** e **qual impacto esperado** para a AMRTS e para a evolução SaaS do sistema.

## Decisões vigentes

| Código | Decisão | Estado | Impacto esperado |
|---|---|---:|---|
| DP-001 | O sistema será oferecido como assinatura mensal, não como venda definitiva do software. | Aprovada | Mantém sustentabilidade operacional, evolução contínua e suporte recorrente. |
| DP-002 | O Plano Básico terá referência comercial de US$20/mês para a AMRTS. | Aprovada | Define base de proposta, contrato e posicionamento inicial. |
| DP-003 | A logo oficial da AMRTS será a identidade visual primária do app. | Implementada | Reforça pertencimento local e confiança institucional. |
| DP-004 | A navegação do associado deve evoluir para página dedicada, não modal principal. | Aprovada | Melhora clareza, escalabilidade de conteúdo e experiência mobile. |
| DP-005 | Os toggles Wide/Boxed na topbar desktop devem usar formato pill. | Implementada | Padroniza interação visual em desktop e aproxima o comportamento do padrão mobile. |
| DP-006 | Usuário já autenticado não deve ser solicitado a logar novamente ao navegar para a página inicial. | Implementada | Reduz fricção e melhora percepção de continuidade de sessão. |
| DP-007 | O Feedback Comunitário será global, discreto e disponível em todas as páginas. | Aprovada | Cria canal contínuo de escuta, melhoria e registro de demandas. |
| DP-008 | O MVP do Feedback Comunitário não terá screenshot automático. | Aprovada | Reduz complexidade, risco de privacidade e esforço inicial. |
| DP-009 | Screenshot poderá ser opcional em etapa futura, mediante consentimento claro. | Aprovada | Permite evolução com evidência visual sem comprometer privacidade. |
| DP-010 | A arquitetura futura deve considerar múltiplas associações por meio de `associationId`. | Aprovada | Prepara o produto para escala SaaS e separação lógica de dados. |
| DP-011 | O app terá uma estratégia de Tutoriais Inteligentes por role, área e menu, chamada Trilha Viva Santorini. | Aprovada | Reduz dúvidas, aumenta autonomia do usuário e transforma a documentação em experiência contextual dentro do app. |

## Critérios de registro

Uma decisão deve ser adicionada a este arquivo sempre que alterar o comportamento do produto, o contrato com o cliente, a operação do sistema, a identidade visual, a arquitetura técnica ou o roadmap comercial. O registro deve ser objetivo e suficiente para que outro desenvolvedor consiga entender o contexto sem depender de conversas anteriores.

| Campo recomendado | Descrição |
|---|---|
| Código | Identificador estável, como `DP-011`. |
| Decisão | Descrição curta e inequívoca da escolha aprovada. |
| Estado | Aprovada, implementada, em validação, substituída ou cancelada. |
| Impacto esperado | Resultado de negócio, UX, suporte, segurança ou manutenção. |

## Relação com outros documentos

As decisões DP-001 e DP-002 estão detalhadas em [Modelo de negócio SaaS](modelo-negocio.md). As decisões DP-007, DP-008 e DP-009 estão especificadas em [Feedback Comunitário](feedback-comunitario.md). As decisões DP-003 e DP-005 estão registradas em [Identidade visual](identidade-visual.md) e no [Roadmap](roadmap.md). A decisão DP-011 está detalhada em [Tutoriais do usuário](tutoriais-usuario.md) e conectada ao plano de evolução do [Portal do Associado](portal-do-associado.md).
