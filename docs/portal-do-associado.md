# Portal do Associado — Guia Completo

> **Versão 2.1** · Implementado em Mai/2026

O Portal do Associado é a área de autoatendimento do sistema AMRTS Santorini. Permite que cada morador acesse suas informações financeiras, cadastrais e operacionais de forma segura e autônoma, sem depender da administração para consultas de rotina.

---

## 1. Como Acessar

1. Acesse `https://zionsti.github.io/santorini`
2. Clique no botão **"Área do Associado"** (canto superior direito)
3. Digite seu **CPF completo** (11 dígitos, com ou sem pontuação)
4. Clique em **"Acessar minha área"**

> ⚠️ O CPF precisa estar cadastrado pelo administrador para que o acesso funcione.  
> Se não conseguir entrar, contate a administração para verificar o cadastro.

### Sessão e Logout

- A sessão é mantida enquanto a aba do navegador estiver aberta (sessionStorage)
- Ao fechar a aba ou o navegador, a sessão é encerrada automaticamente
- Para sair manualmente, clique no botão **"Sair"** no canto superior direito do portal

---

## 2. Seções do Portal

### 🏠 Início

Visão geral da sua situação como associado:

| Card | Descrição |
|------|-----------|
| **Total Contribuído** | Soma de todas as suas contribuições registradas no sistema |
| **Meses Ativos** | Quantidade de meses diferentes em que você tem pagamentos registrados |
| **Última Contribuição** | Data do seu pagamento mais recente |
| **Próxima Estimada** | Estimativa do próximo mês de contribuição (baseada na última) |

Abaixo dos cards, um **gráfico de linha** mostra o valor de suas contribuições nos últimos 6 meses.

---

### 📋 Extrato

Histórico completo de todos os seus pagamentos registrados.

**Como usar:**
- Use o **seletor de mês** (canto superior direito) para navegar entre períodos
- Os botões **← Anterior** e **Próximo →** alternam entre meses cronologicamente
- Cada linha mostra: data, hora, tipo de transação e valor
- A última linha de cada mês exibe o **subtotal do período**

> O extrato mostra apenas os pagamentos identificados com seu nome. Caso algum pagamento esteja faltando, pode ser um problema de identificação — contate a administração.

---

### 💳 Mensalidade

Mostra o status do pagamento do **mês atual**:

- ✅ **Em dia** — Exibe a data e o valor do pagamento registrado neste mês
- ⚠️ **Em aberto** — Nenhum pagamento registrado para o mês atual

**Dados de pagamento (PIX)**  
Esta seção exibirá a chave PIX e demais informações para efetuar o pagamento quando configuradas pela administração.

---

### 👤 Meu Cadastro

Seus dados cadastrais divididos em dois blocos:

**Dados fixos** (somente leitura — alterados apenas pelo admin):
- Nome completo
- Unidade residencial
- Status (Ativo / Inadimplente / Inativo)
- Data de adesão

**Dados de contato** (editáveis por você):
- E-mail
- Telefone

Para atualizar seu contato: edite os campos e clique em **"Salvar alterações"**. A mudança é aplicada imediatamente no banco de dados.

---

### 📅 Reservas

**Solicitar nova reserva:**

1. Selecione a **área** desejada (Salão de Festas, Piscina, Churrasqueira, Quadra, Academia, Outro)
2. Escolha a **data**
3. Defina o **horário de início** e **término**
4. Adicione **observações** se necessário (número de pessoas, equipamentos, etc.)
5. Clique em **"Enviar solicitação"**

> ℹ️ A reserva é criada com status **Pendente**. A administração confirma ou recusa. Você verá o status atualizado na lista abaixo do formulário.

**Minhas reservas:**  
Lista de todas as reservas associadas à sua unidade, com status colorido:
- 🟡 **Pendente** — aguardando confirmação
- 🟢 **Confirmada** — aprovada pela administração
- 🔴 **Cancelada** — recusada ou cancelada

---

### 📢 Comunicados

Lista de todos os comunicados **ativos** publicados pela administração, ordenados do mais recente para o mais antigo.

Tipos de comunicado:
- 🔴 **Urgente** — situação que exige atenção imediata
- 🔵 **Info** — informação geral
- 🟡 **Manutenção** — obras ou manutenções programadas
- 🟢 **Evento** — eventos do residencial

---

### 🔧 Suporte

Abra um chamado de manutenção ou solicitação para a administração:

| Campo | Descrição |
|-------|-----------|
| **Título** *(obrigatório)* | Descrição curta do problema (mínimo 5 caracteres) |
| **Descrição** | Detalhes adicionais sobre o problema |
| **Local** | Onde está o problema (ex: "Garagem Bloco B", "Corredor 3") |
| **Prioridade** | Baixa / Média / Alta / Urgente |

Ao enviar, o chamado aparece no painel de **Manutenção** do admin com:
- Seu nome e unidade registrados automaticamente nas notas
- Status inicial: **Aberto**

---

## 3. Segurança e Privacidade

- O CPF é usado **apenas para identificação** durante o login e não fica armazenado na sessão
- A sessão armazena: nome, unidade, e-mail, telefone, status e data de adesão
- Você só tem acesso às **suas próprias** informações — não é possível ver dados de outros associados
- A autenticação não expõe o CPF na resposta da API — apenas campos não sensíveis são retornados

---

## 4. Requisitos para Administradores

Para que um associado consiga usar o portal, seu cadastro precisa ter:

| Campo | Obrigatório | Notas |
|-------|-------------|-------|
| `nome` | ✅ | Exatamente como aparece nos extratos CSV |
| `cpf` | ✅ | 11 dígitos, com ou sem formatação |
| `unidade` | ✅ | Número/código da unidade |
| `status` | ✅ | `ativo`, `inativo` ou `inadimplente` |
| `email` | ❌ | Pode ser adicionado/editado pelo próprio associado |
| `telefone` | ❌ | Pode ser adicionado/editado pelo próprio associado |
| `joinedAt` | ❌ | Data de adesão (ISO: YYYY-MM-DD) |

> O nome cadastrado deve corresponder **exatamente** ao nome presente nos extratos do InfinitePay para que as transações sejam vinculadas corretamente ao associado.

---

## 5. Funções Convex do Portal

| Função | Tipo | Descrição |
|--------|------|-----------|
| `associates:authenticateAssociate` | query | Autentica pelo CPF completo; retorna campos seguros |
| `associates:updateAssociateContact` | mutation | Atualiza e-mail e telefone pelo `_id` da sessão |
| `transactions:getAllTransactions` | query | Todas as transações (filtradas no frontend por nome) |
| `reservations:getReservationsByUnit` | query | Reservas de uma unidade específica |
| `reservations:createReservation` | mutation | Cria reserva com status `pendente` |
| `announcements:getActiveAnnouncements` | query | Comunicados com `active: true` |
| `maintenances:createMaintenance` | mutation | Cria chamado com status `aberto` |

---

*AMRTS Santorini · Portal do Associado v2.1 · Mai/2026*
