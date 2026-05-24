# 👤 Guia do Usuário — AMRTS Santorini Dashboard

## Perfis de acesso

| Perfil | Como acessa | O que pode fazer |
|--------|------------|-----------------|
| **Visitante público** | Abre o site sem login | Ver informações públicas e conhecer o sistema. |
| **Morador** | Login no portal | Ler comunicados permitidos e abrir suporte quando necessário. |
| **Associado** | Login no portal | Consultar início, extrato, mensalidade, cadastro, reservas, comunicados e suporte. |
| **Diretoria** | Login administrativo | Operar dados financeiros, associados, reservas, comunicados, manutenção e feedbacks. |
| **Sysadmin** | Login administrativo | Administrar usuários, permissões e sustentação técnica do sistema. |

---

## Técnica de uso guiado: Trilha Viva Santorini

O Santorini adota a **Trilha Viva**, uma forma de instrução que ensina o usuário dentro do próprio contexto do app. A primeira versão já está implementada no portal do associado: cada rota principal exibe um card contextual com missão da tela, ações permitidas, passos recomendados, checklist local e próximo passo. O objetivo é que a pessoa saiba **para que serve**, **o que pode ou deve fazer** e **como fazer** sem depender de suporte manual para tarefas simples.

| Pergunta do usuário | Resposta que cada tela deve oferecer |
|---|---|
| Onde estou? | Nome da área e missão da funcionalidade. |
| Para que serve? | Explicação curta sobre o valor daquela tela. |
| O que posso fazer? | Ações permitidas para a role autenticada. |
| Como faço? | Passos práticos e linguagem simples. |
| Como sei que deu certo? | Mensagem, status, registro ou item visível confirmando a ação. |
| E se eu tiver dúvida? | Usar Suporte quando for atendimento operacional ou Feedback quando for melhoria do app. |

A documentação detalhada da estratégia está em [`docs/tutoriais-usuario.md`](tutoriais-usuario.md). Este guia resume as principais rotas de uso para consulta rápida, enquanto o app apresenta a instrução diretamente na tela quando o usuário navega pelo portal.

---

## Acessando o dashboard

**URL:** https://zionsti.github.io/santorini

O dashboard carrega automaticamente as transações mais recentes. O indicador no canto superior direito mostra quantas transações estão carregadas.

---

## Módulo Financeiro

### Resumo (cards superiores)
- **Entradas** — soma de todas as transações de crédito
- **Saídas** — soma de todas as transações de débito
- **Saldo** — entradas menos saídas
- **Contribuintes** — número de associados distintos que já contribuíram

### Gráfico de fluxo mensal
- Barras verde (entradas) e vermelha (saídas) por mês
- Use o seletor de período: 6, 12 ou 24 meses

### Contribuintes Assíduos
- Ranking dos maiores contribuintes por valor acumulado
- Visitantes públicos veem "Associado 042"; admins veem o nome real

### Filtros
- **Mês** — navega pelo histórico mês a mês
- **Tipo** — Todos / Entradas / Saídas
- **Busca** — filtra por nome ou descrição

### Tabela de transações
- Ordenação: mais recentes primeiro
- Colunas: Data, Nome, Tipo, Valor
- Em mobile, a coluna "Tipo" fica inline abaixo do nome

### Inadimplentes
- Lista de associados ativos que **não** têm pagamento no mês selecionado
- Exibe última data de pagamento registrada
- Só visível para admins

---

## Portal do Associado

O Portal do Associado é a área em que o usuário acompanha sua relação cotidiana com a associação. A navegação principal orienta o associado pelos menus **Início**, **Extrato**, **Mensalidade**, **Meu Cadastro**, **Reservas**, **Comunicados** e **Suporte**. Em cada uma dessas rotas, a Trilha Viva apresenta um microtutorial contextual para explicar a missão da tela e as ações esperadas.

> **Privacidade:** o associado visualiza apenas informações compatíveis com sua role. Dados pessoais sensíveis e operações administrativas ficam restritos à diretoria e ao sysadmin.

| Menu | Para que serve | O que fazer | Como confirmar que deu certo |
|---|---|---|---|
| **Início** | Ver um resumo da situação e avisos relevantes. | Ler cards, alertas e atalhos principais. | A situação geral fica compreensível sem abrir todas as telas. |
| **Extrato** | Conferir movimentações e histórico financeiro. | Revisar datas, descrições e valores. | O lançamento esperado aparece no histórico. |
| **Mensalidade** | Entender a situação do mês corrente. | Verificar status, valor e possível pendência. | O status financeiro aparece claro e coerente com o extrato. |
| **Meu Cadastro** | Conferir e atualizar dados permitidos. | Revisar telefone, e-mail e dados visíveis. | O app confirma a atualização ou mantém dados corretos. |
| **Reservas** | Solicitar ou acompanhar áreas comuns. | Escolher área e data quando disponível. | A reserva aparece registrada ou o impedimento fica claro. |
| **Comunicados** | Ler avisos oficiais da associação. | Acompanhar comunicados recentes e urgentes. | O usuário sabe qual orientação oficial deve seguir. |
| **Suporte** | Abrir chamados e pedir ajuda. | Descrever o problema ou dúvida com objetividade. | O chamado aparece no histórico com status inicial. |

### Roteiro recomendado de primeira visita

| Passo | Ação | Intenção |
|---:|---|---|
| 1 | Abrir **Início**. | Entender o panorama geral. |
| 2 | Conferir **Mensalidade** e **Extrato**. | Validar situação financeira e histórico. |
| 3 | Revisar **Meu Cadastro**. | Garantir que a associação consiga entrar em contato. |
| 4 | Ler **Comunicados**. | Ficar alinhado com informações oficiais. |
| 5 | Testar **Reservas**, quando necessário. | Entender como solicitar uso de áreas comuns. |
| 6 | Usar **Suporte** ou **Feedback**. | Resolver problemas operacionais ou sugerir melhoria do app. |

---

## Módulo: Comunicados e Mural

Acesse pelo drawer lateral → **Comunicados**.

### Tipos de comunicado
| Tipo | Ícone | Uso |
|------|-------|-----|
| Info | 🔵 | Avisos gerais |
| Urgente | 🔴 | Situações que exigem atenção imediata |
| Manutenção | 🟡 | Obras, interrupções de serviço |
| Evento | 🟢 | Festas, reuniões, assembleias |

### Filtros
Clique nas pills de tipo para filtrar os comunicados exibidos.

### Admin: criar / editar comunicado
1. Clique em **+ Novo Comunicado**
2. Preencha título, conteúdo e tipo
3. Marque **Ativo** para exibir publicamente
4. Clique em **Salvar**

---

## Módulo: Documentos e Atas

Acesse pelo drawer lateral → **Documentos**.

### Categorias
- **Ata** — atas de assembleias
- **Regulamento** — regimento interno, convenção
- **Contrato** — contratos com fornecedores, prestadores
- **Outro** — demais documentos

### Admin: adicionar documento
1. Clique em **+ Novo Documento**
2. Preencha título, descrição, categoria e data
3. Cole a **URL do arquivo** (Google Drive, Dropbox, etc.)
   - O arquivo não é armazenado no sistema — apenas o link
4. Clique em **Salvar**

---

## Módulo: Assembleias e Votações

Acesse pelo drawer lateral → **Assembleias**.

### Status
- **Agendada** — marcada para o futuro
- **Realizada** — já ocorreu; pode ter ata e votações registradas
- **Cancelada**

### Admin: registrar assembleia
1. Clique em **+ Nova Assembleia**
2. Preencha data, tipo (ordinária/extraordinária), local e pauta
3. Após realizada, adicione ata resumida e número de presentes

### Votações
Em assembleias já realizadas, clique em **+ Votação** para registrar:
- Título da votação
- Opções com contagem de votos
- Resultado final

---

## Módulo: Fornecedores

Acesse pelo drawer lateral → **Fornecedores** (admin).

Cadastre prestadores de serviço com:
- Nome, categoria, CNPJ
- Contato, telefone, e-mail
- Vigência do contrato (início/fim)
- Valor mensal
- Status (ativo/inativo)

---

## Módulo: Patrimônio

Acesse pelo drawer lateral → **Patrimônio** (admin).

Inventário de bens do residencial:
- Nome, categoria, descrição
- Data e valor de aquisição
- Localização
- Status: **Ativo** / **Inativo** / **Em manutenção**

---

## Módulo: Reservas de Áreas Comuns

Acesse pelo drawer lateral → **Reservas** (admin).

Gerencie agendamentos de salão, churrasqueira, quadra, etc.:
- Área, unidade, nome do morador
- Data, horário de início e fim
- Status: **Pendente** / **Confirmada** / **Cancelada**
- Observações

---

## Módulo: Manutenção

Acesse pelo drawer lateral → **Manutenção** (admin).

Chamados de manutenção preventiva e corretiva:
- Título, descrição, área
- Prioridade: **Baixa** / **Média** / **Alta** / **Urgente**
- Status: **Aberto** / **Em andamento** / **Concluído** / **Cancelado**
- Datas de agendamento e conclusão
- Custo

---

## Módulo: Visitantes

Acesse pelo drawer lateral → **Visitantes** (admin).

Registro de entrada e saída:
- Nome, documento, unidade visitada
- Nome do morador responsável
- Data, horário de entrada e saída
- Finalidade da visita
- Veículo (placa)
- Status: **Presente** / **Saiu**

Para registrar saída, clique no botão **Saída** na linha do visitante.

---

## Configurações de layout

Disponíveis no drawer lateral:

| Opção | Efeito |
|-------|--------|
| 🌙 / ☀️ | Alterna tema escuro/claro |
| Boxed | Layout centralizado com largura máxima |
| Wide | Ocupa toda a largura da tela |
| 🖨️ Imprimir | Imprime o dashboard atual |
| 🔄 Atualizar | Recarrega dados do Convex |

---

## Perguntas frequentes

**P: Os dados são atualizados automaticamente?**
R: Não em tempo real — clique em **Atualizar** ou recarregue a página para buscar os dados mais recentes do Convex.

**P: Perdi minha senha de admin. Como recupero?**
R: Entre em contato com o sysadmin do sistema para redefinição via painel Convex.

**P: Meu CPF de 5 dígitos não encontra meu registro.**
R: Verifique se seu cadastro foi importado (o admin precisa importar o CSV de associados). Certifique-se de digitar apenas números, sem pontos ou traços.

**P: Posso acessar pelo celular?**
R: Sim. O dashboard é responsivo (mobile-first) e funciona bem em smartphones Android e iOS.
