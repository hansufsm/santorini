# 📚 Documentação — AMRTS Santorini Dashboard

**Versão:** 3.1  
**Projeto:** Dashboard de gestão financeira e societária do Residencial Santorini  
**Stack:** HTML5 + Tailwind CSS + Chart.js · Convex (banco serverless) · GitHub Pages  
**URL pública:** https://zionsti.github.io/santorini  
**Repositório:** https://github.com/zionsti/santorini

---

## Índice geral

| Documento | Público-alvo | Conteúdo |
|-----------|-------------|---------|
| [Guia do Usuário](guia-usuario.md) | Moradores, Admins | Como usar cada módulo do dashboard |
| [Arquitetura Técnica](arquitetura.md) | Desenvolvedores | Stack, fluxo de dados, decisões de design |
| [API Backend (Convex)](api-backend.md) | Desenvolvedores | Mutations e queries disponíveis |
| [Schema do Banco](schema-banco.md) | Desenvolvedores | Tabelas, campos, índices, relacionamentos |
| [Guia de Operações](operacoes.md) | Admins, DevOps | Deploy, imports, backup, troubleshooting |
| [Solução de Problemas](troubleshooting.md) | Admins | Erros conhecidos e como resolver |
| [Roadmap](roadmap.md) | Todos | Funcionalidades planejadas e concluídas |

---

## Início rápido

### Para o administrador
1. Acesse https://zionsti.github.io/santorini
2. Clique em `≡` (drawer lateral) → **Login Admin**
3. Use suas credenciais para autenticar
4. Importe os dados: CSV de transações e/ou CSV de associados

### Para o associado
1. Acesse https://zionsti.github.io/santorini
2. Clique em **Área do Associado**
3. Digite os **5 primeiros dígitos do seu CPF**
4. Veja seu histórico de contribuições

### Para o desenvolvedor
```bash
git clone https://github.com/zionsti/santorini.git
cd santorini
npm install
npx convex dev --configure=existing --team hans-rogerio-zimmermann --project santorini
# Abrir index.html no browser (Live Server recomendado)
```

---

## Status do sistema

| Componente | Estado |
|-----------|--------|
| Frontend (GitHub Pages) | ✅ Online |
| Backend (Convex) | Verificar em https://dashboard.convex.dev |
| Deploy automático (frontend) | ✅ GitHub Actions — push → Pages em ~1 min |
| Deploy backend pendente | ⚠️ `npx convex deploy` necessário para `clearAllAssociates` e melhorias de schema |

---

## Histórico de versões resumido

| Versão | Data | Destaques |
|--------|------|-----------|
| 1.0 | 2026-05-22 | Fase 1: financeiro + associados + login |
| 2.0 | 2026-05-22 | Fase 2: comunicados + documentos + assembleias |
| 3.0 | 2026-05-22 | Fase 3: 6 módulos operacionais + privacidade + portal CPF |
| 3.1 | 2026-05-22 | Estabilização: import robusto, menus, troubleshooting |

Ver [CHANGELOG.md](../CHANGELOG.md) para o histórico completo.

---

*Última atualização: 2026-05-22*
