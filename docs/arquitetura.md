# 🏗️ Arquitetura Técnica — AMRTS Santorini Dashboard

## Visão geral

```
┌─────────────────────────────────────────────────────────────┐
│                     USUÁRIO (browser)                        │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────▼──────────────────────────────┐
│              GitHub Pages (CDN estático)                     │
│   index.html  ·  script.js  ·  Tailwind CSS (CDN)           │
│   Chart.js (CDN)  ·  PapaParse (CDN)                        │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP API (POST /api/query | /api/mutation)
┌──────────────────────────────▼──────────────────────────────┐
│           Convex Cloud (tough-kangaroo-90.convex.cloud)      │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │ transactions│  │  associates  │  │  announcements...  │ │
│  │ .ts         │  │  .ts         │  │  (+ 9 modules)     │ │
│  └─────────────┘  └──────────────┘  └────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  schema.ts (11 tabelas)              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Premissa fundamental:** o frontend é 100% estático (sem servidor Node/PHP). Toda a persistência acontece no Convex via sua HTTP API pública.

---

## Stack tecnológica

### Frontend
| Biblioteca | Versão | Função |
|-----------|--------|--------|
| Tailwind CSS | CDN | Estilização (utility-first) |
| Chart.js | CDN | Gráficos de barra e pizza |
| PapaParse | CDN | Parse de arquivos CSV no browser |
| Web Crypto API | nativa | Hash SHA-256 de senhas |
| Intl.NumberFormat | nativa | Formatação monetária (pt-BR) |

### Backend
| Serviço | Plano | Função |
|---------|-------|--------|
| Convex | Free tier | Banco de dados serverless + funções TypeScript |
| GitHub Pages | Free | Hospedagem do frontend estático |
| GitHub Actions | Free | CI/CD (deploy automático no push) |

---

## Fluxo de dados

### Leitura (query)
```
browser
  → fetch POST /api/query { path: "module:funcName", args: {...} }
  → Convex executa a query TypeScript
  → retorna { status: "success", value: [...] }   ← HTTP 200 sempre
  → browser atualiza DOM
```

### Escrita (mutation)
```
browser
  → fetch POST /api/mutation { path: "module:funcName", args: {...} }
  → Convex valida args contra v.* schema
  → executa handler TypeScript (lê/escreve no banco)
  → retorna { status: "success", value: ... }
  → browser mostra toast de confirmação
```

### Tratamento de erros HTTP
```javascript
// Convex retorna HTTP 200 mesmo para erros de aplicação!
// É obrigatório verificar data.status:
const data = await response.json();
if (data.status === 'error') {
    throw new Error(data.errorMessage || 'Erro desconhecido');
}
return data.value;
```

---

## Cliente Convex (script.js)

### `convexFetch(endpoint, path, args, timeoutMs)`
Função base. Usa `AbortController` para timeout configurável.

```
endpoint  → "query" | "mutation"
path      → "module:functionName"  ex: "transactions:getAllTransactions"
args      → objeto JSON com argumentos
timeoutMs → padrão 12000 ms (12 s)
```

### `convexQuery(path, args)`
Atalho para queries. Timeout: 12 s.

### `convexMutation(path, args)`  
Atalho para mutations normais. Timeout: 12 s.

### `convexMutationLong(path, args)`  
Mutations de import em lote. Timeout: 120 s (2 min).

---

## Autenticação e sessão

### Mecanismo
- Sem JWT, sem cookies de servidor — tudo em `sessionStorage`
- Senha nunca trafega em plaintext: hash SHA-256 via **Web Crypto API** antes do envio

### Fluxo de login
```
1. Usuário digita e-mail + senha
2. browser calcula SHA-256(senha) → hexString
3. POST /api/query { path: "users:getUserByEmail", args: { email } }
4. Compara passwordHash armazenado com SHA-256 calculado
5. Se igual: sessionStorage.setItem('adminSession', '1')
              sessionStorage.setItem('adminUser', JSON.stringify(user))
6. setAdminMode(true, user) — mostra botões admin em todos os módulos
```

### Sessão
```javascript
// Verificação ao carregar a página:
const session = sessionStorage.getItem('adminSession');
const user    = JSON.parse(sessionStorage.getItem('adminUser') || 'null');
if (session) setAdminMode(true, user);
```

### Primeiro acesso (sysadmin padrão)
Se não existe nenhum usuário no banco, `ensureSysAdmin()` cria automaticamente:
- **e-mail:** `admin@santorini.com`
- **senha:** `admin123`
- **role:** `sysadmin`

> ⚠️ Altere imediatamente após o primeiro deploy.

---

## Privacidade e anonimização

### `maskName(name, own, value)`
Aplicada a todo nome de transação antes de renderizar na tabela pública.

```javascript
function maskName(name, own = null, value = 1) {
    if (!name) return '—';
    if (sessionStorage.getItem('adminSession')) return name;        // admin: nome real
    if (own && name.trim().toLowerCase() === own.trim().toLowerCase())
        return name;                                                  // próprio associado: nome real
    const key = name.trim().toLowerCase();
    if (value >= 0) return `Associado ${String(_stableId(key, 999)).padStart(3, '0')}`;
    return `Despesa ${String(_stableId(key, 99)).padStart(2, '0')}`;
}
```

### `_stableId(str, max)`
Hash determinístico: mesmo nome → mesmo número sempre (consistência entre sessões).

```javascript
function _stableId(str, max) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return (Math.abs(h) % max) + 1;
}
```

### CPF
- CPF completo armazenado no Convex (campo `cpf`) — acessível apenas a admins
- `cpfPrefix` = 5 primeiros dígitos numéricos — usado no Portal do Associado
- O frontend nunca transmite CPF ao browser público

---

## Importação de CSVs

### Transações (InfinitePay)

**Chave de deduplicação:** `${date}|${time}|${value}|${detail}`  
— sem o campo `name`, o que permite reimportar com nomes corrigidos sem gerar duplicatas.

**Lógica:**
```
Para cada linha do CSV:
  1. Calcula transactionKey
  2. Busca no Convex pelo key (índice by_key)
  3. Se existe E nome/tipo mudou → PATCH (atualiza)
  4. Se existe E é igual → skip
  5. Se não existe → INSERT
```

**Batching:** enviado em lotes de 50 registros por mutation para não exceder o limite de execução do Convex (~30 s por mutation).

### Associados

**Formato CSV:**
```
Nome,CPF,E-mail,Telefone,Adesao,Desligamento
```

**Lógica de upsert (O(n) — Map em memória):**
```typescript
const existing = await ctx.db.query("associates").collect();
const byCpf  = new Map(existing.filter(r => r.cpf).map(r => [r.cpf!, r]));
const byName = new Map(existing.map(r => [r.name.toLowerCase(), r]));

for (const a of associates) {
    const found = (a.cpf ? byCpf.get(a.cpf) : null)
               ?? byName.get(a.name.toLowerCase())
               ?? null;
    if (found) patch(found._id, a);
    else       insert(a);
}
```

---

## Navegação e módulos

### Sistema de módulos lazy
```javascript
function switchModule(name) {
    // Oculta todos os módulos
    document.querySelectorAll('.module-section').forEach(s => s.classList.add('hidden'));
    // Exibe o módulo alvo
    document.getElementById(`module-${name}`)?.classList.remove('hidden');
    // Carrega dados apenas se ainda não carregados (lazy)
    if (!moduleLoaded[name]) {
        loadModuleFunctions[name]?.();
        moduleLoaded[name] = true;
    }
}
```

### Módulos disponíveis
| ID | Função de carga | Lazy? |
|----|----------------|-------|
| `financeiro` | `loadFromConvex()` | Não (carrega no init) |
| `comunicados` | `loadAnnouncements()` | Sim |
| `documentos` | `loadDocuments()` | Sim |
| `assembleias` | `loadAssemblies()` | Sim |
| `fornecedores` | `loadSuppliers()` | Sim |
| `patrimonio` | `loadAssets()` | Sim |
| `reservas` | `loadReservations()` | Sim |
| `manutencao` | `loadMaintenances()` | Sim |
| `visitantes` | `loadVisitors()` | Sim |

---

## Decisões de design

| Decisão | Alternativa considerada | Motivo da escolha |
|---------|------------------------|-------------------|
| Convex como backend | Firebase, Supabase | Serverless TypeScript nativo, free tier generoso, HTTP API simples |
| HTML + script.js monolítico | React/Vue SPA | Zero build step, deploy trivial no GitHub Pages |
| SHA-256 no browser | HTTPS + bcrypt no servidor | Não há servidor — toda lógica é no browser ou no Convex |
| sessionStorage (não localStorage) | localStorage | Sessão expira ao fechar o browser (mais seguro) |
| Anonimização hash-deterministsca | Aleatória por sessão | Consistência visual — "Associado 042" é sempre o mesmo |
| Chave de dedup sem nome | Com nome | Permite reimportar CSV com nomes corrigidos sem duplicar |
| Lotes de 50 no import | 1 por vez / tudo de uma vez | Evita timeout do Convex (max ~30 s) mantendo performance |

---

## Limitações conhecidas

1. **Sem realtime push:** o dashboard não atualiza automaticamente quando outro admin importa dados. Necessário clicar em "Atualizar".
2. **Sem upload de arquivos:** documentos são referenciados por URL externa (Google Drive, etc.).
3. **SHA-256 não é bcrypt:** adequado para o contexto, mas não deve ser usado em sistemas com dados médico/financeiro de alta criticidade.
4. **Convex free tier:** limite de 1 GB de armazenamento e 1M de chamadas/mês. Monitorar no [painel Convex](https://dashboard.convex.dev).
