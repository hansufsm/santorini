# 🔧 Solução de Problemas — AMRTS Santorini Dashboard

Diagnóstico e resolução dos erros mais frequentes do sistema.

---

## "Server Error" ao importar associados

### Sintoma
Toast vermelho: `Erro: [Request ID: XXXXXXXX] Server Error` ao clicar em **Importar Associados**.

### Causas possíveis e diagnóstico

#### Causa 1 — Registros corrompidos no banco (mais comum)
Tentativas anteriores de import parcialmente bem-sucedidas podem ter inserido associados **sem o campo `unit`**. A versão antiga do `getAllAssociates` em produção faz `a.unit.localeCompare(b.unit)`, que gera `TypeError` quando `unit` é `undefined`.

**Como identificar:** o erro aparece imediatamente, antes de qualquer progresso no import.

**Solução:**
1. Acesse https://dashboard.convex.dev → Data → tabela `associates`
2. Verifique se há registros com campo `unit` ausente ou vazio de forma inesperada
3. Delete os registros problemáticos manualmente
4. Reimporte o CSV

*Após deploy do Convex:* use o botão **Limpar associados** no drawer para apagar tudo e reimportar do zero.

#### Causa 2 — Versão antiga do Convex em produção (timeout N+1)
O handler `importAssociates` em versões anteriores fazia uma varredura completa da tabela **para cada associado** do lote. Com 50 associados por lote, isso causava timeout (~30 s).

**Como identificar:** o erro aparece após alguns segundos de espera, e o toast de "Carregando cadastro existente…" já apareceu.

**Solução:** o import foi reescrito para rodar no frontend — este problema não deve mais ocorrer na versão atual. Se persistir, execute:
```bash
npx convex deploy --typecheck disable
```

#### Causa 3 — Campos extras rejeitados pela mutation
Versões mais antigas do `createAssociate` ou `importAssociates` não declaravam todos os campos opcionais nos `args`. Passar campos não declarados faz o Convex rejeitar a chamada.

**Solução:** já corrigido na versão atual (frontend só envia campos que existem em qualquer versão do backend).

---

## "Server Error" ao carregar associados / módulo trava em "Carregando"

### Sintoma
Ao abrir o módulo de Associados ou chamar `getAllAssociates`, a página trava ou exibe Server Error.

### Causa
Mesma que "Causa 1" acima — registros no banco com `unit: undefined` fazem o sort em produção crashar.

### Solução imediata
1. Painel Convex → tabela `associates` → deletar registros sem `unit`
2. Recarregar o dashboard

### Solução definitiva
```bash
npx convex deploy --typecheck disable
```
Após o deploy, `getAllAssociates` ordena por `name` (não `unit`) e é seguro com campos opcionais.

---

## Menus / botões da barra travados (não clicam)

### Sintoma
Após um erro, o botão `≡` do drawer e outros botões da navbar param de responder.

### Causa
Um modal ou o drawer abriu (`body.overflow = hidden` + backdrop visível) e o erro impediu o fechamento normal. O backdrop, mesmo "invisível", interceptava os cliques.

### Soluções

| Solução | Como |
|---------|------|
| Fechar com teclado | Pressionar `Esc` fecha o modal/drawer aberto |
| Recarregar | `F5` / `Ctrl+R` reinicia tudo |
| Automático (v3.1+) | `forceCloseAll()` é chamado em qualquer `showConvexError()` — fecha drawer, todos os modais e reseta overflow |

---

## Import de transações trava ou não mostra progresso

### Sintoma
Ao importar CSV de transações, a página fica carregando indefinidamente ou o toast não avança.

### Causas e soluções

| Causa | Solução |
|-------|---------|
| CSV muito grande em uma única chamada | Corrigido: import em lotes de 50 com timeout de 2 min por lote |
| Timeout de 12 s na chamada padrão | Corrigido: import usa `convexMutationLong` (120 s) |
| Convex fora do ar | Verificar https://status.convex.dev |

---

## Login admin não funciona

### Sintoma
Ao digitar e-mail e senha corretos, o botão mostra "Verificando…" e retorna erro ou não faz nada.

### Diagnóstico
```bash
# Gerar o hash que deveria estar no banco:
echo -n "SuaSenha" | sha256sum
# Comparar com o campo passwordHash na tabela users do Convex
```

### Soluções

| Causa | Solução |
|-------|---------|
| Senha diferente da cadastrada | Atualizar `passwordHash` no painel Convex com o hash correto |
| Usuário sem conta no banco | Sistema cria `admin@santorini.com` / `admin123` automaticamente se banco vazio |
| Convex offline | Verificar `CONVEX_URL` em `script.js` linha 11 |

---

## Portal do Associado não encontra o usuário

### Sintoma
Ao digitar os 5 dígitos do CPF, aparece "Nenhum resultado" ou "Associado não encontrado".

### Checklist

- [ ] O CSV de associados foi importado? (verifique no painel Convex → tabela `associates`)
- [ ] O CPF no cadastro tem pelo menos 5 dígitos numéricos?
- [ ] Está digitando apenas números (sem pontos ou traços)?
- [ ] O nome do associado no cadastro bate com o nome nas transações?

> O Portal cruza o `cpfPrefix` do cadastro com o nome nas transações. Se o nome no CSV de associados for diferente do nome no extrato InfinitePay, o histórico não aparece.

---

## Gráficos não aparecem

### Sintoma
As áreas de gráfico ficam em branco ou mostram erro.

### Causas

| Causa | Diagnóstico | Solução |
|-------|------------|---------|
| CDN do Chart.js bloqueado | Console (F12) → erros de rede | Acessar de rede sem bloqueio ou baixar Chart.js localmente |
| Sem transações no banco | Módulo financeiro não tem dados | Importar CSV de transações |
| Erro de JavaScript | Console (F12) → erros em vermelho | Reportar o erro para análise |

---

## Backup manual falha

### Sintoma
O comando `curl` para backup retorna erro ou JSON vazio.

### Verificações
```bash
# Teste básico de conectividade
curl -s https://tough-kangaroo-90.convex.cloud/api/query \
  -X POST -H "Content-Type: application/json" \
  -d '{"path":"transactions:getSummary","args":{}}' | jq .

# Se retornar { "status": "success", ... } → Convex está online
# Se retornar erro → verificar status em https://status.convex.dev
```

---

## Como coletar informações para suporte

Ao reportar um problema, inclua:

1. **Request ID** do erro (aparece no toast: `[Request ID: XXXXXXXX]`)
2. **Ação que causou o erro** (ex: "cliquei em Importar Associados com o arquivo X.csv")
3. **Console do browser** (F12 → aba Console → copiar mensagens vermelhas)
4. **Versão do browser e sistema operacional**
