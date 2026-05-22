# AMRTS Santorini — Dashboard de Gestão Residencial

Sistema completo de gestão financeira e societária para o Residencial Santorini.  
**Versão 2.1** — Dados persistidos no **Convex** · Hospedado no **GitHub Pages**.

## 🌐 Acesso

**URL pública:** `https://zionsti.github.io/santorini`

---

## ⚙️ Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML5 + Tailwind CSS (CDN) + Chart.js + PapaParse |
| Banco de dados | Convex (nuvem, serverless) |
| Hospedagem | GitHub Pages (estático) |
| CI/CD | GitHub Actions (deploy automático no push para `main`) |
| Auth admin | SHA-256 (Web Crypto API) + sessionStorage |
| Auth associado | CPF completo verificado no Convex + sessionStorage |

---

## 👥 Perfis de Acesso

| Perfil | Como acessa | O que vê |
|--------|-------------|----------|
| **Visitante** | URL pública diretamente | Dashboard financeiro com nomes anonimizados |
| **Associado** | Botão "Área do Associado" + CPF | Portal pessoal completo (7 seções) |
| **Admin** | Ícone de engrenagem + e-mail/senha | Tudo + ferramentas de gestão |

---

## 🗂️ Funcionalidades

### Dashboard Financeiro (público)
- Resumo: contribuições, despesas pagas, saldo em caixa, número de associados
- Gráfico de fluxo mensal (contribuições × despesas × saldo acumulado)
- Gráfico de distribuição de despesas por categoria (rosca)
- Ranking dos contribuintes mais assíduos (nomes anonimizados)
- Tabela de transações com filtro de texto, tipo e mês
- Exportação CSV do extrato filtrado
- Temas claro/escuro, layout boxed/wide, impressão

### 🏠 Portal do Associado (autenticado por CPF)

Tela completa acionada pelo botão **"Área do Associado"**, com 7 seções em abas:

| Aba | Descrição |
|-----|-----------|
| **🏠 Início** | Cards de resumo (total contribuído, meses ativos, última contribuição, próxima estimada) + gráfico dos últimos 6 meses |
| **📋 Extrato** | Histórico completo de contribuições com filtro por mês e paginação |
| **💳 Mensalidade** | Status PAGO ✅ / EM ABERTO ⚠️ do mês atual + seção de dados de pagamento PIX |
| **👤 Meu Cadastro** | Dados cadastrais (somente leitura) + edição de e-mail e telefone |
| **📅 Reservas** | Solicitar reserva de área comum + visualizar reservas da unidade |
| **📢 Comunicados** | Comunicados ativos publicados pela administração |
| **🔧 Suporte** | Abrir chamado de manutenção para a administração |

### ⚙️ Painel Administrativo (requer login)
- Importar extratos CSV do InfinitePay (deduplicação automática por chave transação)
- Importar/gerenciar cadastro de associados via CSV
- CRUD: comunicados, documentos, assembleias, fornecedores, patrimônio, reservas, manutenção, visitantes
- Gerenciar usuários administradores (roles: sysadmin / admin / viewer)
- Visualizar lista de inadimplentes por mês

---

## 📁 Estrutura

```
santorini/
├── index.html           # SPA completo (dashboard + portal + admin)
├── script.js            # Lógica JS: Convex HTTP API, UI, gráficos, portal
├── package.json         # Dependência: convex@1.39.1
├── README.md
├── .gitignore           # Exclui CSVs, .env, _generated, node_modules
├── .github/
│   └── workflows/
│       └── deploy.yml   # Deploy automático GitHub Pages (push → main)
├── convex/
│   ├── schema.ts        # Schema completo: 7 tabelas
│   ├── transactions.ts  # Importação e queries financeiras
│   ├── associates.ts    # CRUD + autenticateAssociate + updateAssociateContact
│   ├── reservations.ts  # Reservas de áreas comuns
│   ├── announcements.ts # Comunicados ativos
│   ├── maintenances.ts  # Chamados de manutenção
│   └── _generated/      # Gerado pelo Convex CLI (gitignore)
├── img/
│   └── santorini.png
└── docs/
    ├── portal-do-associado.md  # Guia do portal do associado
    ├── guia-usuario.md         # Guia geral do sistema
    └── arquitetura.md          # Documentação técnica
```

---

## 🚀 Como importar dados financeiros

1. Exporte o extrato no **InfinitePay** (formato CSV)
2. Acesse o dashboard → faça login como admin → **Importar CSV**
3. O sistema deduplica automaticamente e salva no Convex
4. Dashboard atualiza imediatamente

> **Os CSVs nunca são commitados no Git.** Dados ficam exclusivamente no Convex.

---

## 🛠️ Desenvolvimento Local

```bash
# Clonar
git clone https://github.com/zionsti/santorini.git
cd santorini

# Instalar dependências
npm install

# Iniciar Convex (projeto existente)
npx convex dev --configure=existing --team hans-rogerio-zimmermann --project santorini
# → gera convex/_generated/ e conecta ao projeto na nuvem

# Abrir index.html no navegador (Live Server ou http-server)
```

## 📦 Deploy do Backend Convex

Sempre que alterar arquivos em `convex/`, publicar as novas funções:

```bash
npx convex deploy --typecheck disable
```

> O deploy do frontend (GitHub Pages) é automático via GitHub Actions no push para `main`.

---

## 📋 Histórico de Versões

| Versão | Data | Principais mudanças |
|--------|------|---------------------|
| **2.1** | Mai/2026 | Portal do Associado (7 abas, auth CPF); novas tabelas reservations, announcements, maintenances; `authenticateAssociate`, `updateAssociateContact`, `getReservationsByUnit` |
| **2.0** | Mai/2026 | Integração Convex; dashboard financeiro; módulos comunicados, documentos, assembleias, fornecedores, patrimônio, reservas, manutenção, visitantes; sistema de usuários admin |
| **1.0** | 2025 | Versão estática inicial |

---

## 🗺️ Roadmap

| Status | Funcionalidade |
|--------|----------------|
| ✅ | Dashboard financeiro completo (gráficos, tabela, exportação CSV) |
| ✅ | Importação de extrato InfinitePay (CSV, deduplicação automática) |
| ✅ | Cadastro de associados + cálculo de inadimplentes |
| ✅ | Comunicados, documentos, assembleias com votação |
| ✅ | Fornecedores, patrimônio, manutenção, controle de visitantes |
| ✅ | Portal do Associado — autenticação CPF + 7 seções de autoatendimento |
| ✅ | Reservas de áreas comuns (admin + autoatendimento pelo associado) |
| 🔜 | Notificações por e-mail |
| 🔜 | PWA / instalável no celular |
| 🔜 | Segundo fator de auth (data de nascimento) |
| 🔜 | QR Code PIX dinâmico para mensalidade |
| 🔜 | Integração bancária automática |

---

*AMRTS Santorini Dashboard © 2026 — Gestão Residencial*
