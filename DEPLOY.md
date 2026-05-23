# Deploy na Vercel — Guia de Configuração

## Pré-requisitos

1. Conta na [Vercel](https://vercel.com)
2. Repositório no GitHub (este repo)
3. Backend Convex já deployado (`npx convex deploy` rodado localmente)

---

## Passos

### 1. Importar o projeto na Vercel

1. Acesse https://vercel.com/new
2. Conecte sua conta GitHub e selecione este repositório (`zionsti/santorini`)
3. Na tela de configuração, ajuste:
   - **Framework Preset:** Next.js
   - **Root Directory:** `/` (raiz do repositório — padrão, não alterar)
   - **Build Command:** `npm run build` (padrão)
   - **Output Directory:** `.next` (padrão)

### 2. Variáveis de Ambiente

Na tela de configuração (ou em Project Settings → Environment Variables), adicione:

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | `https://tough-kangaroo-90.convex.cloud` |

### 3. Deploy

Clique em **Deploy**. A Vercel irá:
- Instalar dependências (`npm install`)
- Compilar o projeto (`npm run build`)
- Publicar na URL `https://seu-projeto.vercel.app`

---

## Seed do primeiro Sysadmin (se ainda não feito)

Acesse o painel Convex em https://dashboard.convex.dev e execute a mutation:

```
auth:seedFirstSysadmin
{
  "name": "Nome do Admin",
  "email": "admin@email.com",
  "passwordHash": "<SHA-256 da senha>",
  "guardKey": "SANTORINI_SEED_2026"
}
```

Para gerar o hash SHA-256 da senha no terminal:
```bash
echo -n "SuaSenha123" | sha256sum
```

---

## Estrutura de Rotas

| Rota | Acesso | Descrição |
|---|---|---|
| `/` | Público | Dashboard financeiro (dados anonimizados) |
| `/login` | Público | Login por CPF (Associado/Morador) ou email+senha (Diretoria/Sysadmin) |
| `/portal/inicio` | Qualquer login | Resumo financeiro pessoal |
| `/portal/extrato` | Associado+ | Extrato completo de transações |
| `/portal/mensalidade` | Qualquer login | Status da mensalidade mensal |
| `/portal/cadastro` | Qualquer login | Dados cadastrais + editar contato |
| `/portal/reservas` | Qualquer login | Reservar e ver reservas da unidade |
| `/portal/comunicados` | Qualquer login | Comunicados do condomínio |
| `/portal/suporte` | Qualquer login | Abrir e acompanhar chamados |
| `/admin` | Diretoria+ | Dashboard administrativo |
| `/admin/transacoes` | Diretoria+ | Importar CSV e listar transações |
| `/admin/associados` | Diretoria+ | Gerenciar associados e status |
| `/admin/reservas` | Diretoria+ | Confirmar e cancelar reservas |
| `/admin/comunicados` | Diretoria+ | Publicar e inativar comunicados |
| `/admin/manutencao` | Diretoria+ | Gerenciar chamados de manutenção |
| `/admin/usuarios` | **Sysadmin** | Criar e gerenciar usuários do sistema |

---

## Atualizar o deploy

Qualquer `git push` para a branch principal (`main`) aciona um novo deploy automático na Vercel.
