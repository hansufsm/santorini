# 👤 Guia do Usuário — AMRTS Santorini Dashboard

## Perfis de acesso

| Perfil | Como acessa | O que pode fazer |
|--------|------------|-----------------|
| **Visitante público** | Abre o site sem login | Ver resumo financeiro com nomes anonimizados |
| **Associado** | Portal do Associado (CPF) | Ver o próprio extrato de contribuições |
| **Viewer** | Login admin (role viewer) | Visualizar todos os dados sem editar |
| **Admin** | Login admin (role admin) | CRUD completo em todos os módulos |
| **Sysadmin** | Login admin (role sysadmin) | Admin + gestão de usuários |

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

1. Clique em **Área do Associado** (botão no topo ou no drawer)
2. Digite os **5 primeiros dígitos do seu CPF** (apenas números)
   - Exemplo: CPF `123.456.789-00` → digitar `12345`
3. Clique em **Buscar**
4. O portal exibe:
   - Nome do associado
   - Total contribuído
   - Número de meses ativos
   - Última contribuição
   - Histórico completo de transações

> **Privacidade:** você vê apenas o seu próprio histórico. Outros associados aparecem anonimizados.

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
