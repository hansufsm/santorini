# Manual do Administrador — AMRTS Santorini

> **Perfis com acesso:** Diretoria e Sysadmin  
> **URL do painel:** `/admin`

---

## 1. Acesso ao Painel

1. Acesse `/login`
2. Selecione a aba **Diretoria / Admin**
3. Digite seu **e-mail** e **senha**
4. Clique em **Entrar →**

Após o login você será redirecionado para `/admin` — o painel administrativo.

---

## 2. Visão Geral (`/admin`)

Exibe os principais indicadores do residencial em tempo real:

| Card | O que mostra |
|------|-------------|
| **Entradas** | Total recebido (todas as transações positivas) |
| **Saídas** | Total enviado (transações negativas) |
| **Saldo** | Entradas menos Saídas |
| **Transações** | Quantidade total de registros financeiros |
| **Associados Ativos** | Contagem de associados com status "ativo" |
| **Inadimplentes** | Associados sem pagamento no mês atual |
| **Reservas Pendentes** | Reservas aguardando confirmação |
| **Chamados Abertos** | Tickets de manutenção em aberto |

---

## 3. Transações Financeiras (`/admin/transacoes`)

### 3.1 Importar extrato CSV

1. Exporte o extrato do **InfinitePay** em formato CSV
2. Na seção **Importar CSV**, clique em **Escolher arquivo**
3. O sistema exibe uma prévia das primeiras 20 linhas — confira antes de importar
4. Clique em **Importar X transações**
5. O sistema faz **deduplicação automática**: transações já existentes são ignoradas

> O separador pode ser vírgula ou ponto-e-vírgula — o sistema detecta automaticamente.

### 3.2 Visualizar transações

Abaixo do importador, a tabela exibe as últimas 100 transações com data, nome, tipo e valor.

---

## 4. Associados (`/admin/associados`)

### 4.1 Buscar um associado

Use o campo de busca para filtrar por **nome**, **unidade** ou **prefixo de CPF**.

### 4.2 Alterar status

Cada linha tem botões de ação conforme o status atual:

| Status atual | Ações disponíveis |
|---|---|
| Ativo | Inadimplente · Inativar |
| Inadimplente | Ativar · Inativar |
| Inativo | Ativar |

### 4.3 Nomes alternativos de pagamento

Alguns associados têm **mais de um pagador na mesma unidade** — por exemplo, um casal onde ora um, ora o outro faz o pagamento. Como o extrato bancário identifica pelo nome do remetente, o sistema precisa saber quais nomes pertencem à mesma unidade.

**Como configurar:**

1. Na tabela de associados, localize a unidade desejada
2. Clique em **Editar** na coluna Ações
3. No formulário de edição, localize o campo **Nomes alternativos de pagamento**
4. Digite um nome por linha:
   ```
   Amilton Silva
   Macpela dos Santos
   ```
5. Clique em **Salvar alterações**

**Efeito imediato:**  
A partir de então, o portal do associado e o controle de inadimplência passam a reconhecer contribuições feitas por **qualquer** dos nomes cadastrados como pertencentes a essa unidade.

> **Dica:** O nome principal do associado (campo Nome) já é verificado automaticamente — não precisa repeti-lo na lista de nomes alternativos.

> **Correspondência parcial:** o sistema faz busca por similaridade. "Amilton" encontra "Amilton José Silva" sem precisar digitar o nome completo. Se dois associados tiverem nomes parecidos, prefira usar o nome completo para evitar ambiguidade.

---

## 5. Reservas (`/admin/reservas`)

### 5.1 Confirmar ou cancelar

Reservas com status **Pendente** aparecem destacadas no topo:

- **Confirmar** → muda o status para "confirmada"; o associado verá a atualização no portal
- **Cancelar** → muda o status para "cancelada" (soft delete — o registro é mantido)

### 5.2 Histórico

Abaixo das pendências, a tabela exibe reservas confirmadas e canceladas com data, unidade e área.

---

## 6. Comunicados (`/admin/comunicados`)

### 6.1 Criar comunicado

1. Preencha o **título** e o **texto** do comunicado
2. Escolha o **tipo**:
   - 🔵 **Info** — aviso geral
   - 🔴 **Urgente** — situação que exige atenção imediata
   - 🟡 **Manutenção** — obras ou serviços programados
   - 🟣 **Evento** — festa, reunião, assembleia
3. Marque **Ativo** para publicar imediatamente
4. Clique em **Publicar**

### 6.2 Inativar comunicado

Clique no botão **✕ Inativar** ao lado do comunicado. Ele deixa de aparecer para os moradores mas permanece no banco de dados.

---

## 7. Manutenção (`/admin/manutencao`)

Gerencia o fluxo de chamados de suporte abertos pelos moradores.

### Fluxo de status

```
Aberto → Em andamento → Concluído
                      ↘ Cancelado
```

**Ações disponíveis:**

| Botão | Transição |
|---|---|
| **Iniciar** | Aberto → Em andamento |
| **Concluir** | Em andamento → Concluído |
| **Cancelar** | Qualquer → Cancelado (soft delete) |

Chamados concluídos e cancelados aparecem na seção **Histórico** abaixo dos ativos.

---

## 8. Usuários (`/admin/usuarios`) — Sysadmin apenas

Esta tela só é visível para usuários com papel **Sysadmin**.

### 8.1 Criar usuário

1. Clique em **Novo Usuário**
2. Preencha nome, e-mail, senha, papel e unidade (quando aplicável)
3. Clique em **Criar**

**Papéis disponíveis:**

| Papel | Acesso |
|---|---|
| Morador | Portal do associado (sem extrato financeiro) |
| Associado | Portal completo (com extrato) |
| Diretoria | Painel admin completo |
| Sysadmin | Tudo + gestão de usuários |

> O sistema permite no máximo **2 sysadmins ativos** simultaneamente.

### 8.2 Ativar / Inativar usuário

Use os botões na tabela. Um usuário inativo não consegue fazer login. **Nenhum usuário é excluído permanentemente.**

> Você não pode inativar a si mesmo.

---

## 9. Regras gerais

- **Nenhum dado é excluído permanentemente.** Todas as operações de "exclusão" fazem soft delete (registro permanece com `deletedAt` preenchido).
- **Sessão expira em 8 horas.** Após esse período, você é redirecionado para o login automaticamente.
- **Dados financeiros são privados.** O dashboard público exibe nomes anonimizados ("Associado 042"). Apenas a diretoria e o próprio associado veem o nome real.
