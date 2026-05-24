# Proposta de UX — Vídeo, manuais por role, navegação limpa e Mobile First

## Síntese executiva

A evolução proposta para o Santorini deve transformar a interface em uma experiência **Mobile First, limpa e guiada**, sem perder a boa organização já existente no desktop. A direção recomendada é substituir a lógica de “vídeo modal de intro” por uma experiência de **splash/hero progressivo**, criar uma rota própria de **Ajuda, Q&A e Manuais**, segmentada por role, e reorganizar funções secundárias em um **painel lateral de controles**, preservando no desktop apenas os comandos essenciais de navegação e contexto.

> A decisão central é separar três camadas da interface: **conteúdo principal**, **navegação principal** e **controles auxiliares**. Hoje parte da instrução e dos controles disputa espaço com a experiência principal. A proposta é deixar o usuário mais orientado, mas com menos ruído visual.

## 1. Vídeo como splashscreen ou hero total durante carregamento

O problema atual do vídeo é conceitual: ele está funcionando como uma intro sobreposta ao site já carregado. Isso cria risco de parecer publicidade, distração ou “tampa” do sistema. A alternativa mais elegante é usar o vídeo como **estado de entrada**, isto é, enquanto a página pública prepara a experiência, o usuário vê um splash ou hero total com identidade visual do Santorini.

| Proposta | Como funcionaria | Vantagens | Riscos | Recomendação |
|---|---|---|---|---|
| Splashscreen total com vídeo | Ao entrar em `/`, mostra fundo em tela cheia com vídeo, logo e mensagem curta. Depois revela a homepage. | Forte impacto visual e sensação de produto premium. | Pode cansar se aparecer sempre ou se demorar. | Boa para primeira visita, com limite de tempo. |
| Hero total com vídeo incorporado | A própria seção principal da homepage usa o vídeo como background ou mídia central. | Menos intrusivo; o site já “nasce” com o vídeo. | Exige bom contraste e fallback mobile. | Melhor solução de longo prazo. |
| Splash híbrido | Mostra vídeo em tela cheia apenas durante carregamento inicial; depois vira hero estático ou poster. | Equilibra impacto e usabilidade. | Um pouco mais complexo. | **Recomendado para Santorini agora.** |

Minha recomendação é evoluir para um **Splash Hero Híbrido**. Na primeira visita, a página pública abre com um hero em tela cheia contendo o vídeo, logo AMRTS Santorini, uma frase curta e botão “Entrar no portal”. Após alguns segundos, o conteúdo da página aparece de forma suave. Nas visitas seguintes, o usuário vê diretamente a homepage com o hero já estático ou com o vídeo como elemento de fundo menos dominante.

| Comportamento | Regra proposta |
|---|---|
| Primeira visita no navegador | Exibir splash/hero por 6 a 8 segundos ou até o usuário tocar em “Pular”. |
| Visitas seguintes | Não bloquear a navegação; usar hero normal, com poster ou vídeo em baixa interferência. |
| Mobile | Preferir poster/imagem estática com botão de play opcional para poupar dados e evitar autoplay inconsistente. |
| Desktop | Permitir vídeo maior e mais imersivo, mantendo CTA visível. |
| Acessibilidade | Respeitar `prefers-reduced-motion`, oferecendo poster estático. |

A implementação futura deveria trocar o componente atual `SiteIntroVideo` por algo como `PublicSplashHero`, integrado apenas em `app/page.tsx`. O vídeo não deve estar em `/portal`, `/login` ou `/admin`.

## 2. Central de Q&A e manuais de instrução por role

Concordo com a crítica sobre a localização atual do manual. A Trilha Viva é boa como ajuda contextual, mas a documentação principal precisa ter um endereço claro, previsível e permanente. O melhor caminho é criar uma rota dedicada, por exemplo **`/portal/ajuda`** para usuários internos e, se necessário, **`/admin/ajuda`** para diretoria e sysadmin. Também é possível usar uma rota única **`/ajuda`**, que ajusta o conteúdo conforme a sessão.

| Solução | Descrição | Prós | Contras | Recomendação |
|---|---|---|---|---|
| `/portal/ajuda` e `/admin/ajuda` separados | Cada área tem sua central própria. | Simples de entender; navegação por contexto. | Pode duplicar conteúdo. | Boa no curto prazo. |
| `/ajuda` única com conteúdo por role | Uma central global detecta role e mostra manuais permitidos. | Mais elegante e escalável. | Exige controle de permissão bem desenhado. | **Melhor para médio prazo.** |
| Trilha Viva apenas contextual | Manter só cards nas telas. | Já existe parcialmente. | Não resolve busca, Q&A e manual completo. | Não recomendado como única solução. |

A proposta é criar uma **Central de Ajuda Santorini** com três camadas: Q&A rápido, manuais por área e roteiros por role. Assim, um morador vê instruções simples de comunicados e suporte; um associado vê também extrato, mensalidade, cadastro e reservas; a diretoria vê gestão financeira, usuários, transações e governança; o sysadmin vê tudo, incluindo manutenção técnica e permissões.

| Role | Conteúdo base visível | Conteúdo adicional |
|---|---|---|
| Morador | Início, comunicados, suporte, regras gerais. | Dúvidas frequentes de convivência e canais oficiais. |
| Associado | Tudo do morador, extrato, mensalidade, cadastro, reservas. | Explicações financeiras e passos de atualização cadastral. |
| Diretoria | Tudo do associado, painel administrativo, transações, associados, reservas, comunicados, manutenção, feedbacks, usuários. | Boas práticas de governança e cuidados com dados. |
| Sysadmin | Tudo da diretoria, permissões sensíveis, diagnóstico e manutenção avançada. | Procedimentos técnicos e auditoria. |

No menu, recomendo que a chamada apareça de forma muito visível: **“Ajuda e Manuais”**. No mobile, ela deve estar no menu lateral de usuário. No desktop, pode aparecer tanto na topbar secundária quanto no sidebar, mas eu prefiro colocá-la no **sidebar/painel lateral**, porque documentação é navegação de suporte, não ação principal da tela.

## 3. Painel lateral para funções da secondary topbar

Vale a pena planejar a migração de várias funções da secondary topbar para um painel com botão toggle lateral, principalmente para limpar a interface e preparar o produto para Mobile First. A imagem de referência enviada tem uma boa lógica: um menu lateral limpo, com marca no topo, lista vertical simples, conta do usuário no rodapé e ações auxiliares discretas.

> A referência visual sugere uma navegação menos “barulhenta”: poucos itens, muito espaço em branco, agrupamento por função e área inferior reservada para identidade da conta e ações secundárias.

A recomendação é criar um **Control Panel lateral** acessível por um botão discreto, como “Controles”, “Preferências” ou um ícone de sliders. Esse painel receberia funções que hoje não precisam competir com a navegação principal, como tema, modo wide/boxed, densidade visual, ajuda, feedback, preferências e talvez dados da sessão.

| Função | Onde deveria ficar | Justificativa |
|---|---|---|
| Navegação principal | Sidebar ou abas principais | O usuário precisa chegar às áreas de trabalho rapidamente. |
| Ajuda e Manuais | Sidebar e painel lateral | Deve ser fácil encontrar, mas não ocupar o centro da tela. |
| Wide/Boxed | Painel lateral no mobile; pill discreto no desktop | No desktop é útil; no mobile é secundário. |
| Tema claro/escuro | Painel lateral | É preferência, não fluxo principal. |
| Feedback | Ícone discreto persistente ou painel lateral | Deve estar sempre disponível, mas sem poluir. |
| Dados da conta/logout | Rodapé do sidebar/painel | Segue a referência visual enviada e melhora organização. |

Minha proposta é não remover tudo da topbar imediatamente. O ideal é fazer uma transição em duas etapas: primeiro, criar o painel lateral mantendo os controles atuais; depois, medir/usabilidade e mover gradualmente os itens menos usados.

## 4. Mobile First com desktop aprimorado conforme necessidade

A decisão de ser **Mobile First** é correta para um sistema residencial, porque muitos usuários acessarão pelo celular para consultar mensalidade, comunicados, reservas e suporte. O desktop deve continuar bom para diretoria e sysadmin, que fazem tarefas mais operacionais, mas a base de desenho precisa começar no celular.

| Diretriz | Mobile | Desktop |
|---|---|---|
| Navegação | Bottom nav ou drawer lateral simples. | Sidebar persistente ou topbar secundária, conforme área. |
| Conteúdo | Cards empilhados, ações grandes e leitura curta. | Tabelas, filtros, painéis e modo wide/boxed. |
| Manuais | Ajuda em rota própria, busca e cards por tema. | Central com índice lateral e conteúdo mais denso. |
| Controles secundários | Painel lateral acionado por botão. | Painel lateral ou topbar compacta com pills. |
| Layout | Sem depender de hover; toque confortável. | Aproveitar largura, atalhos e comparação de dados. |

Para o portal de usuários, eu sugiro migrar as abas horizontais atuais para um padrão mais mobile: uma barra inferior com 4 itens essenciais e um botão “Mais”, ou um drawer lateral com agrupamentos. Para o admin, o sidebar desktop atual pode ser refinado com a inspiração da imagem: marca no topo, grupos claros, itens com menos ícones decorativos, usuário no rodapé e links auxiliares no fim.

## Proposta de arquitetura de navegação

A arquitetura ideal separa o produto em três superfícies: portal do usuário, administração e central de ajuda. A central de ajuda pode ser compartilhada, mas renderizada conforme a role.

| Área | Rota sugerida | Navegação sugerida | Observação |
|---|---|---|---|
| Entrada pública | `/` | Hero/splash com vídeo e CTA | Não deve carregar instruções internas. |
| Portal | `/portal/*` | Mobile first com drawer/bottom nav; desktop com topbar limpa | Associado e morador. |
| Admin | `/admin/*` | Sidebar desktop; mobile com drawer | Diretoria e sysadmin. |
| Ajuda | `/ajuda` ou `/portal/ajuda` + `/admin/ajuda` | Índice, busca, Q&A e cards por role | Conteúdo filtrado por permissão. |
| Preferências | Painel lateral global | Tema, wide/boxed, feedback, conta | Evita poluir a topbar. |

## Priorização recomendada

A implementação deve ser incremental para evitar retrabalho visual. Primeiro deve-se resolver a experiência de entrada e a localização dos manuais; depois, reorganizar controles e refinar a navegação mobile.

| Fase | Entrega | Impacto | Complexidade | Prioridade |
|---:|---|---|---|---|
| 1 | Transformar intro em Splash Hero Híbrido na página pública | Alto | Média | Alta |
| 2 | Criar rota “Ajuda e Manuais” com conteúdo filtrado por role | Muito alto | Média | Alta |
| 3 | Adicionar chamada “Ajuda e Manuais” no menu do usuário e/ou topbar secundária | Alto | Baixa | Alta |
| 4 | Criar painel lateral de preferências/controles auxiliares | Médio/alto | Média | Média |
| 5 | Migrar gradualmente funções secundárias da topbar para o painel | Médio | Média | Média |
| 6 | Redesenhar navegação mobile do portal com drawer ou bottom nav + “Mais” | Muito alto | Alta | Alta, mas após ajuda |
| 7 | Refinar desktop com sidebar inspirado na referência e toggle wide/boxed | Médio | Média | Média |

## Recomendação final

Eu recomendo aprovar uma evolução em três frentes. Primeiro, trocar o vídeo modal por um **Splash Hero Híbrido** para que a entrada pública pareça parte natural do carregamento e da identidade do site. Segundo, criar uma **Central de Ajuda e Manuais** com Q&A, busca e conteúdo filtrado por role, acessível de forma clara no menu lateral ou topbar secundária. Terceiro, iniciar um **Painel Lateral de Controles** para remover ruído da secondary topbar sem perder funcionalidades importantes como tema, wide/boxed, feedback e dados da conta.

A direção visual deve seguir a referência enviada: sidebar limpo, com marca no topo, navegação vertical enxuta, bastante respiro, usuário no rodapé e ações secundárias agrupadas. A experiência deve nascer no celular e ser ampliada no desktop conforme tarefas administrativas exigirem mais espaço, tabelas e controle visual.
