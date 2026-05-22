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
> O frontend no GitHub Pages não inclui o código Convex — ele precisa ser publicado separadamente.

### Pré-requisitos
```bash
# Na máquina local
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
Após o comando concluir, acesse o [painel Convex](https://dashboard.convex.dev) e confirme:
- Schema atualizado em **Data** → Tables
- Funções publicadas em **Functions**

### ⚠️ Após usar o deploy key
**Rotacione a chave** no painel Convex para não deixá-la exposta:  
Settings → Deploy Keys → Regenerate

---

## 3. Importação de transações (extrato financeiro)

### Obter o CSV
1. Acesse o painel InfinitePay
2. Vá em **Extrato** → exportar CSV
3. Salve o arquivo localmente (nunca commite no repositório)

### Importar no dashboard
1. Faça login como admin
2. Menu lateral `≡` → **Importar CSV**
3. Selecione o arquivo `.csv`
4. Aguarde: o sistema envia em lotes de 50 registros
5. Toast de confirmação: `✓ X inseridos, Y atualizados`

### Reimportar com nomes corrigidos
Se precisar corrigir nomes (ex: primeiro import tinha nomes anonimizados):

1. Menu lateral `≡` → **Limpar histórico** (botão laranja)
2. Confirme a exclusão
3. Reimporte o CSV com os nomes reais

> A chave de deduplicação é `data|hora|valor|tipo` — **sem o nome**.  
> Isso garante que reimportar o mesmo CSV não gera duplicatas, mesmo com nomes diferentes.

---

## 4. Importação de associados (cadastro)

### Formato do CSV
```
Nome,CPF,E-mail,Telefone,Adesao,Desligamento
Maria Silva,123.456.789-00,maria@email.com,(55) 99999-0000,01/01/2024,
João Inativo,987.654.321-00,joao@email.com,(55) 88888-0000,01/01/2023,01/06/2024
```

**Regras:**
- Separador: `,` ou `;` (auto-detectado)
- Datas: `dd/mm/yyyy` ou `yyyy-mm-dd`
- `Desligamento` vazio → status `ativo`; preenchido → status `inativo`
- Vírgula trailing no final de cada linha: aceita normalmente
- Linha com `Nome` vazio: ignorada

### Importar no dashboard
1. Faça login como admin
2. Menu lateral `≡` → **Importar Associados**
3. Selecione o arquivo `.csv`
4. Aguarde os lotes serem processados
5. Toast: `✓ X inseridos, Y atualizados`

### Lógica de upsert
- Se o CPF já existe no banco → **atualiza** o registro
- Se o CPF não existe mas o nome bate exatamente → **atualiza**
- Caso contrário → **insere** novo registro

> Para que o deploy do Convex seja desnecessário neste passo, o CSV de associados  
> **não precisa** ter coluna de unidade — o campo é opcional no schema.

---

## 5. Gestão de usuários admin

### Criar usuário
1. Login como sysadmin
2. Menu lateral `≡` → **Usuários** (ícone de pessoas)
3. Clique em **+ Novo Usuário**
4. Preencha: nome, e-mail, senha, role (sysadmin / admin / viewer)
5. Salvar

### Roles
| Role | Permissões |
|------|-----------|
| `viewer` | Visualização de todos os módulos, sem editar |
| `admin` | CRUD em todos os módulos, exceto gestão de usuários |
| `sysadmin` | Admin + criar/editar/excluir usuários |

### Redefinir senha
Apenas pelo painel Convex (sem recuperação por e-mail implementada):
1. Acesse https://dashboard.convex.dev
2. Tabela `users` → edite o campo `passwordHash`
3. Gere o novo hash SHA-256: `echo -n "novaSenha" | sha256sum`

---

## 6. Primeiro acesso ao sistema

Se não há nenhum usuário cadastrado, o sistema cria automaticamente:

| Campo | Valor |
|-------|-------|
| E-mail | `admin@santorini.com` |
| Senha | `admin123` |
| Role | `sysadmin` |

**Troque a senha imediatamente** após o primeiro login criando um novo usuário.

---

## 7. Desenvolvimento local

```bash
# 1. Clonar
git clone https://github.com/zionsti/santorini.git
cd santorini

# 2. Instalar dependências
npm install

# 3. Conectar ao Convex existente (ambiente de produção)
npx convex dev --configure=existing --team hans-rogerio-zimmermann --project santorini

# 4. Para criar um ambiente de desenvolvimento separado (recomendado):
npx convex dev   # cria um novo projeto dev isolado
# Atualizar CONVEX_URL em script.js com a URL do ambiente dev

# 5. Abrir index.html no browser
# Recomendado: VS Code + extensão "Live Server"
```

---

## 8. Variáveis de configuração

Todas as configurações estão diretamente em `script.js` (não há arquivo `.env`):

```javascript
const CONVEX_URL        = "https://tough-kangaroo-90.convex.cloud"; // linha 11
const CONVEX_TIMEOUT_MS = 12_000;    // timeout padrão (12 s)
// timeout long (mutations de import): 120_000 ms — hardcoded em convexMutationLong
```

---

## 9. Monitoramento e limites

### Painel Convex
https://dashboard.convex.dev → projeto `santorini`

| Métrica | Limite (Free Tier) | Onde ver |
|---------|-------------------|---------|
| Armazenamento | 1 GB | Usage → Storage |
| Chamadas de função | 1M/mês | Usage → Function calls |
| Bandwidth | 1 GB/mês | Usage → Bandwidth |

### GitHub Pages
- Limite de 1 GB de repositório (não é relevante — CSVs não são commitados)
- SLA: sem garantia (uso pessoal/organizacional gratuito)

---

## 10. Backup dos dados

O Convex não oferece backup automático no free tier.

**Estratégia manual:**
```bash
# Via HTTP API — exporta todas as transações para JSON
curl -X POST https://tough-kangaroo-90.convex.cloud/api/query \
  -H "Content-Type: application/json" \
  -d '{"path":"transactions:getAllTransactions","args":{}}' \
  | jq '.value' > backup-transacoes-$(date +%Y%m%d).json

# Associados
curl -X POST https://tough-kangaroo-90.convex.cloud/api/query \
  -H "Content-Type: application/json" \
  -d '{"path":"associates:getAllAssociates","args":{}}' \
  | jq '.value' > backup-associados-$(date +%Y%m%d).json
```

Recomendação: executar mensalmente e armazenar em local seguro (não no repositório).

---

## 11. Troubleshooting

### "Carregando dados..." não termina
- **Causa:** Convex offline ou URL incorreta
- **Solução:** Verificar CONVEX_URL em `script.js`; confirmar se o projeto está ativo no painel Convex

### "Server Error" ao importar associados
- **Causa mais comum:** versão desatualizada do Convex em produção
- **Solução:** executar `npx convex deploy --typecheck disable`

### Menus travados após erro
- **Causa:** `body.style.overflow = 'hidden'` não foi resetado
- **Workaround:** recarregar a página (`F5`)
- **Correção permanente:** já implementada em `showConvexError()`

### Login não funciona após criar novo usuário
- **Causa:** senha digitada diferente da cadastrada (hash não bate)
- **Verificação:** no painel Convex, confirme o `passwordHash` da tabela `users`

### Gráficos não aparecem
- **Causa:** CDN do Chart.js bloqueado por firewall/proxy
- **Verificação:** abrir console do browser (F12) e verificar erros de rede
