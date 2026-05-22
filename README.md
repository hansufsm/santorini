# AMRTS Santorini — Dashboard de Contribuições

Dashboard interativo para gestão financeira do Residencial Santorini.  
Versão 2.0 — Dados persistidos no **Convex** · Hospedado no **GitHub Pages**.

## 🌐 Acesso

**URL pública:** `https://zionsti.github.io/santorini`

## ⚙️ Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML5 + Tailwind CSS + Chart.js + PapaParse |
| Banco de dados | Convex (nuvem, tempo real) |
| Hospedagem | GitHub Pages |
| CI/CD | GitHub Actions (deploy automático no push) |

## 📁 Estrutura

```
santorini/
├── index.html                  # Dashboard principal
├── script.js                   # Lógica + integração Convex
├── README.md
├── .gitignore                  # Exclui CSVs e dados sensíveis
├── .github/
│   └── workflows/
│       └── deploy.yml          # Deploy automático GitHub Pages
├── convex/
│   ├── schema.ts               # Schema das tabelas
│   ├── transactions.ts         # Queries e mutations financeiras
│   └── associates.ts           # Queries e mutations de associados
├── img/
│   └── santorini.png
└── docs/
    ├── index.html
    ├── guia-usuario.md
    └── detalhes-tecnicos.md
```

## 🚀 Como atualizar os dados

1. Exporte o extrato no **InfinitePay** (formato CSV)
2. Acesse o dashboard: `https://zionsti.github.io/santorini`
3. Clique em **Importar CSV** e selecione o arquivo
4. O sistema deduplica automaticamente e salva no Convex
5. O dashboard atualiza imediatamente

> **Os CSVs nunca são commitados no GitHub.** Dados ficam exclusivamente no Convex.

## 🛠️ Desenvolvimento local

```bash
# 1. Clonar o repositório
git clone https://github.com/zionsti/santorini.git
cd santorini

# 2. Iniciar o Convex (projeto existente)
npx convex dev --configure=existing --team hans-rogerio-zimmermann --project santorini

# 3. Copiar a CONVEX_URL gerada para script.js
# Linha: const CONVEX_URL = "https://SEU_PROJETO.convex.cloud";

# 4. Abrir index.html no navegador (ou usar Live Server)
```

## 📦 Deploy

A cada `git push` na branch `main`, o GitHub Actions faz o deploy automático.  
O site é atualizado em ~1 minuto.

```bash
git add .
git commit -m "feat: descrição da mudança"
git push origin main
```

## 📋 Módulos — Roadmap

| Fase | Módulo | Status |
|------|--------|--------|
| 1 | Transações financeiras | ✅ Implementado |
| 1 | Cadastro de associados | ✅ Implementado |
| 1 | Inadimplentes (view calculada) | ✅ Implementado |
| 2 | Documentos e atas | 🔜 Planejado |
| 2 | Assembleias e votações | 🔜 Planejado |
| 2 | Comunicados e mural | 🔜 Planejado |
| 3 | Fornecedores e contratos | 🔜 Planejado |
| 3 | Patrimônio e empréstimos | 🔜 Planejado |
| 3 | Reserva de áreas comuns | 🔜 Planejado |
| 3 | Banco de indicações | 🔜 Planejado |
| 3 | Manutenção preventiva | 🔜 Planejado |
| 3 | Controle de acesso/visitantes | 🔜 Planejado |

---

*AMRTS Santorini Dashboard © 2026 — Gestão Residencial*
