# AMRTS Santorini — Dashboard de Gestão Residencial

Dashboard interativo para gestão financeira e societária do Residencial Santorini.
**v3.0** — Dados persistidos no **Convex** · Hospedado no **GitHub Pages**.

---

## 🌐 Acesso

**URL pública:** `https://zionsti.github.io/santorini`

---

## ⚙️ Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML5 + Tailwind CSS + Chart.js + PapaParse |
| Banco de dados | Convex (nuvem, serverless, tempo real) |
| Hospedagem | GitHub Pages |
| CI/CD | GitHub Actions (deploy automático no push) |

---

## 📁 Estrutura

```
santorini/
├── index.html                  # Dashboard principal (SPA)
├── script.js                   # Toda a lógica + integração Convex
├── README.md
├── CHANGELOG.md                # Histórico detalhado de versões
├── .gitignore                  # Exclui CSVs, node_modules e dados sensíveis
├── .github/
│   └── workflows/
│       └── deploy.yml          # Deploy automático no GitHub Pages
├── convex/
│   ├── schema.ts               # Schema de todas as tabelas
│   ├── transactions.ts         # Financeiro: queries e mutations
│   ├── associates.ts           # Associados: CRUD + importação CSV
│   ├── announcements.ts        # Comunicados e mural
│   ├── documents.ts            # Documentos e atas
│   ├── assemblies.ts           # Assembleias e votações
│   ├── suppliers.ts            # Fornecedores e contratos
│   ├── assets.ts               # Patrimônio
│   ├── reservations.ts         # Reservas de áreas comuns
│   ├── maintenances.ts         # Manutenção preventiva/corretiva
│   ├── visitors.ts             # Controle de acesso / visitantes
│   └── users.ts                # Gestão de usuários admin
└── package.json                # Convex CLI
```

---


## Documentação do projeto

A documentação oficial está organizada na pasta [`docs/`](docs/index.md). Ela inclui visão geral, registro de decisões, modelo de negócio SaaS, roadmap, identidade visual, portal do associado, Feedback Comunitário, arquitetura técnica, backend Convex, schema do banco, operações e troubleshooting.

| Documento | Finalidade |
|---|---|
| [`docs/index.md`](docs/index.md) | Índice principal e convenções de manutenção documental. |
| [`docs/feedback-comunitario.md`](docs/feedback-comunitario.md) | Especificação do módulo global de feedback em seis etapas. |
| [`docs/modelo-negocio.md`](docs/modelo-negocio.md) | Registro do modelo SaaS por assinatura mensal. |
| [`docs/registro-decisoes.md`](docs/registro-decisoes.md) | Memória de decisões de produto, UX e negócio. |
| [`docs/identidade-visual.md`](docs/identidade-visual.md) | Uso da logo AMRTS, favicons e padrões visuais. |

## ✅ Módulos implementados

| Fase | Módulo | Status |
|------|--------|--------|
| 1 | Transações financeiras (import CSV InfinitePay) | ✅ |
| 1 | Cadastro de associados | ✅ |
| 1 | Inadimplentes (view calculada por mês) | ✅ |
| 2 | Comunicados e mural de avisos | ✅ |
| 2 | Documentos e atas | ✅ |
| 2 | Assembleias e votações | ✅ |
| 3 | Fornecedores e contratos | ✅ |
| 3 | Patrimônio | ✅ |
| 3 | Reservas de áreas comuns | ✅ |
| 3 | Manutenção preventiva/corretiva | ✅ |
| 3 | Controle de acesso / visitantes | ✅ |
| 3 | Gestão de usuários (admin/viewer) | ✅ |
| 4 | **Botão do Pânico** (alerta emergência + geolocalização) | 🔜 Roadmap |

---

## 🔒 Segurança e privacidade

- **Senhas** armazenadas como hash SHA-256 (Web Crypto API); nunca em plaintext
- **Nomes em transações**: visitantes públicos veem "Associado 042" / "Despesa 07";
  admins e o próprio associado autenticado veem o nome real
- **CPF**: apenas os 5 primeiros dígitos (`cpfPrefix`) são expostos publicamente
  para o Portal do Associado; CPF completo só é acessível para admins
- **CSVs nunca são commitados** no repositório

---

## 📥 Importação de dados

### Transações (InfinitePay CSV)
1. Exporte o extrato no InfinitePay (formato CSV)
2. Faça login como admin → Menu lateral → "Importar CSV"
3. O sistema deduplica automaticamente (chave: `data|hora|valor|tipo`)
4. Reimport com nomes reais: use "Limpar histórico" antes de reimportar

### Associados (CSV manual)
Formato aceito:
```
Nome,CPF,E-mail,Telefone,Adesao,Desligamento
Maria Silva,123.456.789-00,maria@email.com,(55) 99999-0000,01/01/2024,
João Inativo,987.654.321-00,joao@email.com,(55) 88888-0000,01/01/2023,01/06/2024
```
- Separador: `,` ou `;` (auto-detectado)
- Datas: `dd/mm/yyyy` ou `yyyy-mm-dd`
- `Desligamento` vazio → status `ativo`; preenchido → status `inativo`
- Upsert por CPF (se disponível) ou nome exato

### Portal do Associado
- Acesse a seção "Área do Associado"
- Digite os **5 primeiros dígitos do CPF** para ver seu extrato de contribuições

---

## 🚀 Deploy do Convex (backend)

> **Necessário sempre que arquivos em `convex/` forem alterados.**
> O GitHub Pages hospeda apenas o frontend; o backend roda no Convex.

```bash
# Na sua máquina local, dentro da pasta do projeto:
npx convex deploy --typecheck disable
# Informe o deploy key quando solicitado
```

**Deploy key:** painel Convex → Settings → Deploy Keys
Após usar, **rotacione a chave** para manter a segurança.

---

## 🛠️ Desenvolvimento local

```bash
# 1. Clonar o repositório
git clone https://github.com/zionsti/santorini.git
cd santorini

# 2. Instalar dependências
npm install

# 3. Iniciar Convex em modo dev (conecta ao projeto existente)
npx convex dev --configure=existing --team hans-rogerio-zimmermann --project santorini

# 4. Abrir index.html no navegador (ou usar Live Server)
```

---

## 📦 Deploy do frontend

A cada `git push` na branch `main`, o GitHub Actions publica automaticamente.
O site atualiza em ~1 minuto.

```bash
git add .
git commit -m "feat: descrição da mudança"
git push origin main
```

---

## 🗺️ Roadmap — Fase 4

| # | Funcionalidade | Prioridade |
|---|----------------|-----------|
| 1 | **Botão do Pânico** — alerta de emergência com geolocalização (Google Maps link) enviado a todos os associados que optaram por receber alertas | Alta |
| 2 | Canal de notificação para o Botão do Pânico (a definir: push browser / SMS / e-mail) | Alta |
| 3 | Opt-in de alertas por associado | Média |
| 4 | Histórico de acionamentos de emergência | Média |
| 5 | Dashboard financeiro com previsão de inadimplência | Baixa |

---

*AMRTS Santorini Dashboard © 2026 — Gestão Residencial*
