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

### Opção C — Deploy manual pelo terminal local

Use esta opção quando uma mudança em `convex/` já foi enviada ao `main`, mas o backend publicado ainda está executando funções antigas. Esse foi o caso observado após a regra de aliases financeiros do associado Amilton: o código estava no repositório, mas a consulta ao backend publicado ainda separava `MACPELA EMP IMOBILIARIOS LTDA` de `Amilton`, indicando que o Convex não havia recebido o deploy mais recente.

| Situação | Comando recomendado | Observação |
|---|---|---|
| Primeiro uso no computador | `npx convex login` | Abre o fluxo de autenticação no Convex. |
| Projeto ainda não vinculado localmente | `npx convex dev` | Cria ou atualiza a configuração local do deployment. Depois de vincular, interrompa com `Ctrl+C`. |
| Deploy manual autenticado | `npx convex deploy --typecheck disable` | Publica as funções e schema da pasta `convex/` no deployment configurado. |
| Deploy não interativo | `CONVEX_DEPLOY_KEY=prod:... npx convex deploy --typecheck disable` | Útil para CI/CD; não grave a chave no repositório nem em arquivos temporários. |

Fluxo completo recomendado:

```bash
cd /caminho/para/santorini
pnpm install
npx convex login
npx convex dev
# aguarde o vínculo do projeto/deployment, depois pressione Ctrl+C
npx convex deploy --typecheck disable
```

Antes de publicar, confirme se o ambiente local aponta para o mesmo backend usado em produção. No projeto Santorini, a URL pública atualmente documentada é `https://tough-kangaroo-90.convex.cloud`.

```bash
grep -E '^(CONVEX_DEPLOYMENT|NEXT_PUBLIC_CONVEX_URL)=' .env.local
```

A saída esperada deve conter `CONVEX_DEPLOYMENT` preenchido e `NEXT_PUBLIC_CONVEX_URL` apontando para o backend de produção. Se `CONVEX_DEPLOYMENT` não existir, execute `npx convex dev` para vincular o projeto antes de tentar `npx convex deploy`.

> `--typecheck disable` é necessário porque os tipos gerados (`_generated/`) não estão no repo — são criados pelo `npx convex dev` localmente. Isso não desabilita a publicação das funções; apenas evita que a checagem de tipos bloqueie o deploy em ambientes que ainda não têm os arquivos gerados.

Após o deploy, valide uma função afetada pelo painel Convex ou pela aplicação publicada. Para mudanças financeiras, recarregue o site e confira se o comportamento esperado aparece no histórico e na inadimplência.

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

### Variáveis de ambiente

Em **Project Settings → Environment Variables**:

| Nome | Valor |
|------|-------|
| `NEXT_PUBLIC_CONVEX_URL` | `https://tough-kangaroo-90.convex.cloud` |
| `PCLOUD_CLIENT_ID` | Client ID público do app pCloud, atualmente `9uBhtzMOviR` |
| `PCLOUD_CLIENT_SECRET` | Segredo do app pCloud; configurar somente na Vercel, nunca no código |
| `PCLOUD_REDIRECT_URI` | `https://santorini.org.br/api/pcloud-oauth/callback` |
| `PCLOUD_API_HOST` | `api.pcloud.com` ou `eapi.pcloud.com`, conforme a região da conta |
| `PCLOUD_FOLDER_ID` | Identificador da pasta onde ficam os CSVs dos extratos |
| `PCLOUD_ACCESS_TOKEN` | Opcional: token administrativo persistente para uso sem depender de cookie de autorização |

> Variáveis com prefixo `NEXT_PUBLIC_` são embutidas no bundle JavaScript no momento do build. As variáveis `PCLOUD_*` sem esse prefixo são lidas apenas no servidor pelas rotas internas de API e devem ser configuradas como segredos no ambiente de produção.

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
| `/admin/transacoes` | **Sysadmin** | Importar CSV, listar transações e executar conciliações financeiras sensíveis |
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
- [ ] Configurar as variáveis `PCLOUD_*` na Vercel se a sincronização autenticada do pCloud for usada
- [ ] Fazer deploy da Vercel (automático após configuração)
- [ ] Executar `auth:seedFirstSysadmin` pelo painel Convex para criar o primeiro admin
- [ ] Testar login em `/login` com email+senha do admin criado
