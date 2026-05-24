# Portal do Associado

O Portal do Associado é a área dedicada para que associados e moradores acessem informações relevantes sem depender do painel administrativo. A decisão aprovada é evoluir o portal como **página dedicada**, e não como modal principal, permitindo navegação, conteúdo recorrente e ampliação gradual de módulos.

## Princípio de produto

> O associado deve encontrar uma área que tenha coisas para ele consumir: contribuições, comunicados, reservas, suporte, mensalidade e informações da própria unidade.

A experiência deve ser simples, responsiva e contextual. O usuário autenticado não deve ser obrigado a refazer login ao retornar para a página inicial ou navegar entre áreas do sistema, desde que sua sessão ainda esteja válida.

## Rotas atuais

| Rota | Finalidade |
|---|---|
| `/portal` | Entrada do portal e redirecionamento contextual. |
| `/portal/inicio` | Página inicial do associado. |
| `/portal/extrato` | Histórico financeiro e contribuições do associado. |
| `/portal/mensalidade` | Informações de mensalidade/contribuição. |
| `/portal/comunicados` | Comunicados direcionados à comunidade. |
| `/portal/reservas` | Consulta ou solicitação de reservas, conforme evolução. |
| `/portal/suporte` | Canal de suporte ou orientação. |
| `/portal/cadastro` | Cadastro ou atualização de dados, conforme permissões. |

## Perfis e permissões

| Perfil | Acesso esperado | Observação |
|---|---|---|
| Associado | Consulta dados financeiros próprios e informações da unidade. | Deve estar vinculado a `associateId`. |
| Morador | Acessa comunicados, reservas e suporte, sem histórico financeiro do titular quando não autorizado. | Pode estar vinculado a `parentAssociateId`. |
| Diretoria | Acessa painel administrativo e pode visualizar dados gerenciais. | Não deve depender do portal para gestão. |
| Sysadmin | Acesso técnico/administrativo amplo. | Papel restrito e controlado. |

## Experiência planejada

A página dedicada deve priorizar uma visão inicial clara, com cartões de resumo e ações frequentes. O portal deve comunicar valor ao associado mesmo quando ele não estiver buscando extrato financeiro, reforçando a percepção de transparência e utilidade.

| Seção | Conteúdo recomendado |
|---|---|
| Saudação contextual | Nome do usuário, unidade e status básico. |
| Resumo financeiro | Última contribuição, total pago e situação quando aplicável. |
| Comunicados recentes | Avisos ativos e informações da diretoria. |
| Ações rápidas | Reservas, suporte, mensalidade e atualização cadastral. |
| Feedback Comunitário | Acesso pelo botão global, com contexto da rota. |

## Substituição do modal como solução principal

O uso de modal pode continuar útil para ações rápidas, mas não deve ser a arquitetura principal do portal. Uma página dedicada é mais adequada para crescimento do produto, acessibilidade, URLs compartilháveis, analytics, suporte e navegação mobile.

| Critério | Modal | Página dedicada |
|---|---:|---:|
| Conteúdo extenso | Limitado | Adequado |
| Navegação direta por URL | Fraca | Forte |
| Escalabilidade de módulos | Baixa | Alta |
| Acessibilidade | Exige mais cuidado | Mais previsível |
| Experiência mobile | Pode ficar apertada | Melhor controle de layout |

## Diretrizes de autenticação

A sessão do usuário é armazenada em cookie pelo módulo `lib/auth.tsx`, com validade de oito horas. A experiência esperada é restaurar a sessão ao montar a aplicação e evitar pedidos redundantes de login quando houver cookie válido.

| Situação | Comportamento esperado |
|---|---|
| Usuário autenticado acessa a página inicial | Deve receber contexto ou redirecionamento adequado, sem novo login obrigatório. |
| Sessão expirada | Deve ser direcionado ao login com mensagem clara. |
| Logout | Cookie deve ser limpo e estado global atualizado. |
| Troca de sessão | Interface deve reagir ao evento de mudança de sessão. |

## Referências internas

[1]: ../lib/auth.tsx "Módulo de autenticação do frontend"
[2]: roadmap.md "Roadmap do produto"
[3]: feedback-comunitario.md "Feedback Comunitário"
