# 🗺️ Roadmap — AMRTS Santorini Dashboard

## Fases concluídas

### ✅ Fase 1 — Fundação (2026-05-22)
Infraestrutura base e módulo financeiro.

| # | Funcionalidade | Status |
|---|---------------|--------|
| 1.1 | Dashboard HTML responsivo (mobile-first) | ✅ |
| 1.2 | Integração com Convex (HTTP API) | ✅ |
| 1.3 | Importação de extrato CSV InfinitePay | ✅ |
| 1.4 | Deduplicação por chave `data|hora|valor|tipo` | ✅ |
| 1.5 | Gráfico de fluxo mensal (Chart.js) | ✅ |
| 1.6 | Ranking de contribuintes (Contribuintes Assíduos) | ✅ |
| 1.7 | Resumo financeiro (cards de stats) | ✅ |
| 1.8 | Filtros por mês e tipo de transação | ✅ |
| 1.9 | Cadastro de associados (CRUD) | ✅ |
| 1.10 | Lista de inadimplentes por mês | ✅ |
| 1.11 | Login admin com SHA-256 + sessionStorage | ✅ |
| 1.12 | Tema claro/escuro e layout boxed/wide | ✅ |

---

### ✅ Fase 2 — Comunicação e Governança (2026-05-22)

| # | Funcionalidade | Status |
|---|---------------|--------|
| 2.1 | Drawer lateral de navegação | ✅ |
| 2.2 | Módulo: Comunicados e Mural (4 tipos) | ✅ |
| 2.3 | Módulo: Documentos e Atas (links externos) | ✅ |
| 2.4 | Módulo: Assembleias (ord./extraord.) | ✅ |
| 2.5 | Votações aninhadas a assembleias | ✅ |
| 2.6 | Menu hamburguer mobile | ✅ |

---

### ✅ Fase 3 — Operações e Privacidade (2026-05-22)

| # | Funcionalidade | Status |
|---|---------------|--------|
| 3.1 | Módulo: Fornecedores e contratos | ✅ |
| 3.2 | Módulo: Patrimônio / inventário | ✅ |
| 3.3 | Módulo: Reservas de áreas comuns | ✅ |
| 3.4 | Módulo: Manutenção preventiva/corretiva | ✅ |
| 3.5 | Módulo: Controle de acesso / visitantes | ✅ |
| 3.6 | Gestão de usuários admin (sysadmin/admin/viewer) | ✅ |
| 3.7 | Anonimização pública ("Associado 042" / "Despesa 07") | ✅ |
| 3.8 | Portal do Associado por CPF (5 dígitos) | ✅ |
| 3.9 | Importação CSV de associados (upsert, lotes) | ✅ |
| 3.10 | Limpeza e reimportação de histórico financeiro | ✅ |
| 3.11 | Timeout com AbortController em todas as chamadas | ✅ |
| 3.12 | Import em lotes de 50 + timeout estendido (2 min) | ✅ |

---

## Em desenvolvimento

| # | Funcionalidade | Prioridade | Observação |
|---|---------------|-----------|-----------|
| — | Deploy Convex pendente (schema unit opcional + importAssociates fixado) | 🔴 Crítico | Executar `npx convex deploy` para desbloquear import de associados |

---

## Fase 4 — Segurança e Comunicação em Tempo Real (planejada)

### 🆘 Botão do Pânico (prioridade alta)

**Descrição:** Botão de emergência acessível a associados autenticados que:
1. Captura geolocalização via `navigator.geolocation.getCurrentPosition()`
2. Monta link do Google Maps: `https://maps.google.com/?q={lat},{lng}`
3. Envia alerta a todos os associados que optaram por receber notificações
4. Registra o evento no histórico (quem acionou, quando, coordenadas)
5. Permite cancelar / marcar como falso alarme

**Dependências a definir:**
- Canal de notificação: **Web Push** (PWA, sem custo), **SMS** (Twilio/Zenvia) ou **E-mail** (Resend/SendGrid)
- Tabela `alerts` no schema Convex
- Tabela `alert_opt_in` ou campo `receiveAlerts: boolean` em `associates`
- Rate limiting: máximo X acionamentos por hora por usuário

**Mockup do fluxo:**
```
Associado autenticado
  → clica "🆘 Emergência"
  → browser solicita permissão de geolocalização
  → se concedida: captura lat/lng
  → POST Convex: createAlert({ userId, lat, lng, timestamp })
  → Convex dispara notificação para todos os opt-in
  → Link: https://maps.google.com/?q=-27.1234,-52.5678
  → Associado vê botão "Cancelar alarme" por 5 minutos
```

---

### 📬 4.2 — Notificações por E-mail (média prioridade)

- Integração com **Resend** ou **SendGrid** via Convex HTTP Action
- Casos de uso: inadimplência, comunicados urgentes, confirmação de reserva
- Opt-in por associado no portal

---

### 📱 4.3 — PWA (Progressive Web App) (média prioridade)

- `manifest.json` para instalação no celular
- Service Worker para cache offline básico
- Ícone de app na tela inicial (Android/iOS)
- Push notifications nativas (Web Push API)

---

### 📊 4.4 — Relatórios e Exportação (baixa prioridade)

- Exportar tabela de inadimplentes para CSV/PDF
- Relatório mensal em PDF (resumo financeiro + assembleias + manutenções)
- Exportar histórico do associado

---

### 🔐 4.5 — Segurança aprimorada (baixa prioridade)

- Substituir SHA-256 por bcrypt/argon2 (requer endpoint de servidor intermediário)
- Recuperação de senha por e-mail
- Registro de auditoria (log de ações admin)
- 2FA opcional para administradores

---

## Ideias futuras (backlog)

| Ideia | Complexidade |
|-------|-------------|
| Integração com boleto bancário (auto-reconciliação de pagamentos) | Alta |
| Chatbot para associados (perguntas sobre regras, disponibilidade) | Alta |
| App mobile nativo (React Native / Flutter) | Muito alta |
| Mapa interativo do residencial (reservas por área visual) | Média |
| Sorteio de vagas de garagem / unidades | Baixa |
| Enquetes rápidas para associados | Média |
| Dashboard de consumo de água/energia por unidade | Alta |

---

## Como propor uma funcionalidade

Abra uma **issue** no GitHub:  
https://github.com/zionsti/santorini/issues/new

Inclua:
1. Descrição da funcionalidade
2. Quem se beneficia (admins, associados, todos)
3. Prioridade sugerida (crítica / alta / média / baixa)
4. Qualquer detalhe de comportamento esperado

---

*Última atualização: 2026-05-22*
