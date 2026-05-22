# ⚙️ Guia de Operações — AMRTS Santorini Dashboard

## 1. Deploy do frontend (GitHub Pages)

O frontend é publicado automaticamente a cada `git push` na branch `main`.

```bash
git add .
git commit -m "feat: descrição clara da mudança"
git push origin main
```

O GitHub Actions leva ~1 minuto para publicar. Acompanhe em:  
`https://github.com/zionsti/santorini/actions`

---

## 2. Deploy do backend (Convex)

> **Obrigatório sempre que qualquer arquivo em `convex/` for alterado.**  
> O frontend no GitHub Pages é estático — o backend Convex precisa ser publicado separadamente.

### Pré-requisitos
```bash
cd /caminho/para/santorini
npm install   # instala o Convex CLI local
```

### Comando de deploy
```bash
npx convex deploy --typecheck disable
```

Quando solicitado, informe o **deploy key** do projeto  
(obtenha em: https://dashboard.convex.dev → Projeto → Settings → Deploy Keys).

### Verificar o deploy
Após concluir, acesse o [painel Convex](https://dashboard.convex.dev) e confirme:
- Schema atualizado em **Data → Tables**
- Funções publicadas em **Functions**

### ⚠️ Após usar o deploy key
**Rotacione a chave** no painel Convex: Settings → Deploy Keys → Regenerate.

### O que o próximo deploy vai publicar
O repositório tem melhorias que ainda não estão em produção:

| Arquivo | Mudança | Impacto |
|---------|---------|---------|
| `schema.ts` | `unit: v.optional` (era obrigatório) | Associados sem unidade agora persistem corretamente |
| `schema.ts` | `leftAt` adicionado | Data de desligamento persiste no campo correto (não em `notes`) |
| `associates.ts` | `clearAllAssociates` adicionado | Botão "Limpar associados" no drawer passa a funcionar |
| `associates.ts` | `importAssociates` com Map (sem N+1) | Import em lote via backend volta a funcionar |
| `associates.ts` | `getAllAssociates` ordena por `name` (não `unit`) | Não crasha com registros sem unidade |

---

## 3. Importação de transações (extrato financeiro)

### Obter o CSV
1. Acesse o painel **InfinitePay**
2. Vá em **Extrato** → exportar CSV
3. Salve localmente (nunca commite no repositório)

### Importar no dashboard
1. Login como admin → `≡` → **Importar CSV**
2. Selecione o arquivo `.csv`
3. O sistema envia em lotes de 50 e mostra progresso no toast
4. Confirmação: `✓ X inseridos, Y atualizados, Z pulados`

### Reimportar com nomes reais (após anonimização)
1. `≡` → **Limpar histórico** (botão laranja) → confirmar
2. Reimporte o CSV com os nomes reais

> **Chave de deduplicação:** `data|hora|valor|tipo` — sem o nome.  
> Reimportar o mesmo CSV nunca gera duplicatas, mesmo com nomes diferentes.

---

## 4. Importação de associados (cadastro)

### Formato do CSV aceito
```
Nome,CPF,E-mail,Telefone,Adesao,Desligamento
Maria Silva,123.456.789-00,maria@email.com,(55) 99999-0000,01/01/2024,
João Inativo,987.654.321-00,joao@email.com,(55) 88888-0000,01/01/2023,01/06/2024
```

**Regras de parsing:**
| Campo | Obrigatório | Formato |
|-------|------------|---------|
| Nome | ✅ | Texto livre |
| CPF | — | `000.000.000-00` ou só dígitos |
| E-mail | — | Texto livre |
| Telefone | — | Texto livre |
| Adesao | — | `dd/mm/yyyy` ou `yyyy-mm-dd` |
| Desligamento | — | `dd/mm/yyyy` ou `yyyy-mm-dd`; vazio = ativo |

- Separador `,` ou `;` — detectado automaticamente
- Vírgula trailing no final de cada linha: aceita
- Linha com `Nome` vazio: ignorada

### Importar no dashboard
1. Login como admin → `≡` → **Importar Associados**
2. Selecione o arquivo `.csv`
3. Toast de progresso a cada 5 registros
4. Resultado: `✓ X inseridos, Y atualizados`

### Como funciona o upsert (deduplicação no frontend)
O sistema carrega todos os associados existentes **uma vez**, monta mapas em memória e decide por registro:

```
Para cada linha do CSV:
  1. Busca por CPF exato no mapa (preferencial)
  2. Se não encontrado, busca por nome (case-insensitive)
  3. Se encontrado → chama updateAssociate (atualiza campos)
  4. Se não encontrado → chama createAssociate (insere novo)
```

> Esta lógica roda **no browser** — não depende de deploy do Convex.

### Reimportar / Limpar associados
Se precisar recriar o cadastro do zero:

**Opção A — Painel Convex (disponível agora):**
1. https://dashboard.convex.dev → Data → tabela `associates`
2. Selecionar todos → deletar

**Opção B — Botão no drawer (requer deploy):**
1. `≡` → **Limpar associados** (botão laranja)
2. Confirmar → reimportar o CSV

---

## 5. Gestão de usuários admin

### Criar usuário
1. Login como sysadmin → `≡` → **Gerenciar Usuários**
2. Clique em **+ Novo Usuário**
3. Preencha nome, e-mail, senha e role
4. Salvar

### Roles
| Role | Permissões |
|------|-----------|
| `viewer` | Leitura de todos os módulos, sem editar |
| `admin` | CRUD em todos os módulos, exceto usuários |
| `sysadmin` | Admin + criar/editar/excluir usuários |

### Redefinir senha (sem e-mail de recuperação)
```bash
# Gerar hash SHA-256 da nova senha
echo -n "novaSenha" | sha256sum
# Colar o hash no campo passwordHash da tabela users no painel Convex
```

---

## 6. Primeiro acesso ao sistema

Se não há nenhum usuário no banco, o sistema cria automaticamente:

| Campo | Valor padrão |
|-------|-------------|
| E-mail | `admin@santorini.com` |
| Senha | `admin123` |
| Role | `sysadmin` |

> ⚠️ **Troque a senha imediatamente** criando um novo usuário com senha forte e deletando ou desativando o padrão.

---

## 7. Desenvolvimento local

```bash
# 1. Clonar
git clone https://github.com/zionsti/santorini.git
cd santorini

# 2. Dependências
npm install

# 3a. Conectar ao projeto de produção (cuidado — altera dados reais)
npx convex dev --configure=existing --team hans-rogerio-zimmermann --project santorini

# 3b. Criar ambiente de dev isolado (recomendado)
npx convex dev
# Copiar a CONVEX_URL gerada para a linha 11 de script.js

# 4. Abrir index.html (recomendado: VS Code + extensão Live Server)
```

---

## 8. Variáveis de configuração

Todas as configs estão em `script.js` — não há `.env`:

```javascript
// script.js — linha 11
const CONVEX_URL        = "https://tough-kangaroo-90.convex.cloud";
const CONVEX_TIMEOUT_MS = 12_000;    // timeout padrão: 12 s
// convexMutationLong usa 120_000 ms (2 min) — hardcoded
```

---

## 9. Monitoramento e limites

| Serviço | Métrica | Limite (Free) | Onde ver |
|---------|---------|--------------|---------|
| Convex | Armazenamento | 1 GB | dashboard → Usage → Storage |
| Convex | Chamadas/mês | 1 M | dashboard → Usage → Functions |
| Convex | Bandwidth | 1 GB/mês | dashboard → Usage → Bandwidth |
| GitHub Pages | Repositório | 1 GB | (não relevante — CSVs não commitados) |

---

## 10. Backup dos dados

O Convex free tier não tem backup automático. Estratégia manual mensal:

```bash
# Transações
curl -s -X POST https://tough-kangaroo-90.convex.cloud/api/query \
  -H "Content-Type: application/json" \
  -d '{"path":"transactions:getAllTransactions","args":{}}' \
  | jq '.value' > backup-transacoes-$(date +%Y%m%d).json

# Associados
curl -s -X POST https://tough-kangaroo-90.convex.cloud/api/query \
  -H "Content-Type: application/json" \
  -d '{"path":"associates:getAllAssociates","args":{}}' \
  | jq '.value' > backup-associados-$(date +%Y%m%d).json
```

Armazene os arquivos gerados em local seguro, **nunca no repositório**.

---

## 11. Troubleshooting

Ver também: [Solução de Problemas](troubleshooting.md) para diagnóstico detalhado.

| Sintoma | Causa provável | Solução rápida |
|---------|---------------|---------------|
| "Carregando dados..." indefinido | Convex offline / URL errada | Verificar `CONVEX_URL` em `script.js` |
| "Server Error" ao importar associados | Registros corrompidos no banco | Ver `troubleshooting.md` — seção "Server Error associados" |
| Menus / botões travados | `overflow:hidden` preso após erro | Pressionar `Esc` ou `F5` |
| Login não funciona | Hash de senha não bate | Regenerar hash via `sha256sum` no painel Convex |
| Gráficos não aparecem | CDN bloqueado | Verificar console (F12) → erros de rede |
| "Associado não encontrado" no portal | CPF não importado | Verificar se o CSV de associados foi importado |
