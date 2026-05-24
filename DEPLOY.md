# Deploy — Guia de Configuração

O sistema tem **dois serviços independentes** que precisam ser deployados separadamente:

| Serviço | O que é | Como deploya |
|---------|---------|--------------|
| **Convex** | Backend serverless (banco + funções) | `npx convex deploy` ou GitHub Actions |
| **Vercel** | Frontend Next.js | Automático a cada `git push main` |

> ⚠️ **Erro frequente:** alterar arquivos em `convex/` e fazer push sem re-deployar o Convex. O Vercel sobe o frontend novo, mas o backend em produção continua com o código antigo → erros "Server Error" no login e nas queries.

---

## 1. Backend Convex

### Por que o Convex precisa de deploy separado?

O Convex não faz parte do bundle do Vercel. Ele roda na infraestrutura própria da Convex (cloud functions em V8 isolates). O `NEXT_PUBLIC_CONVEX_URL` aponta para esse endpoint externo. Quando o schema ou as funções mudam, é necessário enviar o novo código para a Convex via `npx convex deploy`.

Se o deploy do Convex não for feito após mudanças em `convex/`:
- Tabelas novas não existem no banco → `Server Error` nas mutations
- Índices novos não existem → `Server Error` nas queries que os usam
- Funções antigas continuam rodando → comportamento inconsistente com o frontend

### Opção A — Deploy junto com o Vercel (mais simples, recomendado)

O build command da Vercel pode executar `npx convex deploy` antes de `next build`, deployando os dois serviços em uma única operação. A chave é configurada nas variáveis de ambiente da Vercel (mesma tela onde está `NEXT_PUBLIC_CONVEX_URL`).

**Configuração única (fazer uma vez):**

1. Acesse o [painel Convex](https://dashboard.convex.dev) → seu projeto → **Settings → Deploy Keys**
2. Clique em **Generate Production Deploy Key** e copie a chave (começa com `prod:...`)
3. Na Vercel → **Project Settings → Environment Variables**, adicione:
   - Nome: `CONVEX_DEPLOY_KEY`  ·  Valor: a chave copiada  ·  Environments: todos
4. Na Vercel → **Project Settings → General → Build & Development Settings → Build Command**, troque para:
   ```
   npm run build:full
   ```
   *(equivale a `npx convex deploy --typecheck disable && next build`)*
5. Salve e faça um novo deploy

A partir daí, cada push em `main` deploya o Convex e o Next.js juntos na mesma pipeline.

### Opção B — Deploy automático via GitHub Actions

O arquivo `.github/workflows/convex-deploy.yml` dispara `npx convex deploy` automaticamente sempre que arquivos em `convex/**` mudam no branch `main`.

**Configuração única (fazer uma vez):**

1. Acesse o [painel Convex](https://dashboard.convex.dev) → **Settings → Deploy Keys → Generate Production Deploy Key**
2. No GitHub → **Settings → Secrets and variables → Actions → New repository secret**:
   - Nome: `CONVEX_DEPLOY_KEY`  ·  Valor: a chave copiada
3. Pronto. A partir daí, cada push em `main` com mudanças em `convex/` fará o deploy

**Para forçar um re-deploy manual pelo GitHub UI:**
GitHub → Actions → "Deploy Convex Backend" → Run workflow → Branch: main → Run

### Opção C — Deploy manual (localmente)

```bash
# Primeira vez: autenticar
npx convex login

# Deploy em produção
npx convex deploy --typecheck disable
```

Ou com deploy key (sem login interativo, útil em CI/CD):

```bash
CONVEX_DEPLOY_KEY=prod:... npx convex deploy --typecheck disable
```

> `--typecheck disable` é necessário porque os tipos gerados (`_generated/`) não estão no repo — são criados pelo `npx convex dev` localmente.

### Seed do primeiro Sysadmin

Após o primeiro deploy do Convex (banco vazio), crie o usuário administrador pelo [painel Convex](https://dashboard.convex.dev) → Functions → `auth:seedFirstSysadmin`:

```json
{
  "name": "Nome do Admin",
  "email": "admin@email.com",
  "passwordHash": "<SHA-256 da senha>",
  "guardKey": "SANTORINI_SEED_2026"
}
```

Para gerar o SHA-256 da senha:
```bash
echo -n "SuaSenha123" | sha256sum
```

---

## 2. Frontend Vercel

### Importar o projeto (primeira vez)

1. Acesse https://vercel.com/new
2. Conecte sua conta GitHub e selecione o repositório `zionsti/santorini`
3. Configurações:
   - **Framework Preset:** Next.js
   - **Root Directory:** `/` (raiz — padrão, não alterar)
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

### Variável de ambiente obrigatória

Em **Project Settings → Environment Variables**:

| Nome | Valor |
|------|-------|
| `NEXT_PUBLIC_CONVEX_URL` | `https://tough-kangaroo-90.convex.cloud` |

> Esta variável é embutida no bundle JavaScript no momento do build (prefixo `NEXT_PUBLIC_`). Se for alterada na Vercel, é necessário um novo deploy para surtir efeito.

### Deploys automáticos

Qualquer `git push` para `main` aciona um novo deploy na Vercel automaticamente.

---

## 3. Estrutura de Rotas

| Rota | Acesso | Descrição |
|------|--------|-----------|
| `/` | Público | Dashboard financeiro (dados anonimizados) |
| `/login` | Público | Login por CPF (Associado/Morador) ou email+senha (Diretoria/Sysadmin) |
| `/portal/inicio` | Qualquer login | Resumo financeiro pessoal |
| `/portal/extrato` | Associado+ | Extrato completo de transações |
| `/portal/mensalidade` | Qualquer login | Status da mensalidade mensal |
| `/portal/cadastro` | Qualquer login | Dados cadastrais + editar contato |
| `/portal/reservas` | Qualquer login | Reservar e ver reservas da unidade |
| `/portal/comunicados` | Qualquer login | Comunicados do residencial |
| `/portal/suporte` | Qualquer login | Abrir e acompanhar chamados |
| `/admin` | Diretoria+ | Dashboard administrativo |
| `/admin/transacoes` | Diretoria+ | Importar CSV e listar transações |
| `/admin/associados` | Diretoria+ | Gerenciar associados e status |
| `/admin/reservas` | Diretoria+ | Confirmar e cancelar reservas |
| `/admin/comunicados` | Diretoria+ | Publicar e inativar comunicados |
| `/admin/manutencao` | Diretoria+ | Gerenciar chamados de manutenção |
| `/admin/usuarios` | **Sysadmin** | Criar e gerenciar usuários do sistema |

---

## 4. Checklist de deploy completo

Para um deploy do zero (novo ambiente):

- [ ] Clonar o repositório
- [ ] Criar projeto no Convex Dashboard e copiar a URL do projeto
- [ ] Configurar `CONVEX_DEPLOY_KEY` como secret no GitHub
- [ ] Fazer push em `main` com qualquer mudança em `convex/` para disparar o deploy do backend
- [ ] Criar projeto na Vercel apontando para este repositório
- [ ] Configurar `NEXT_PUBLIC_CONVEX_URL` nas variáveis de ambiente da Vercel
- [ ] Fazer deploy da Vercel (automático após configuração)
- [ ] Executar `auth:seedFirstSysadmin` pelo painel Convex para criar o primeiro admin
- [ ] Testar login em `/login` com email+senha do admin criado
