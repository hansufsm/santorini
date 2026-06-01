# Cadastro seguro da `CONVEX_DEPLOY_KEY` no GitHub Actions

Este roteiro cadastra ou atualiza o segredo `CONVEX_DEPLOY_KEY` no repositório GitHub usado pelo projeto Santorini. A chave é solicitada no terminal sem aparecer na tela e é enviada ao GitHub CLI por `stdin`, evitando que o valor fique gravado no histórico do shell.

## Pré-requisitos

| Requisito | Como verificar |
|---|---|
| Estar dentro do repositório Santorini | `cd /home/ubuntu/santorini` |
| GitHub CLI instalado | `gh --version` |
| GitHub CLI autenticado | `gh auth status` |
| Permissão de administrador ou mantenedor no repositório | Necessária para gravar segredos em Actions |

## Uso recomendado

Execute o script a partir da raiz do repositório:

```bash
cd /home/ubuntu/santorini
chmod +x scripts/setup-convex-deploy-key.sh
./scripts/setup-convex-deploy-key.sh --run-workflow
```

Quando o terminal pedir, cole a chave completa e pressione **Enter**. O valor não será exibido na tela.

## Uso sem disparar workflow

Caso queira apenas cadastrar a chave e publicar depois, execute:

```bash
cd /home/ubuntu/santorini
chmod +x scripts/setup-convex-deploy-key.sh
./scripts/setup-convex-deploy-key.sh
```

Depois publique o backend Convex manualmente com:

```bash
gh workflow run "Deploy Convex Backend" --repo hansufsm/santorini --ref main
```

## Acompanhar a execução

Após disparar o workflow, acompanhe com:

```bash
gh run list --repo hansufsm/santorini --limit 5
gh run watch --repo hansufsm/santorini
```

## Observação de segurança

Não informe a chave como argumento de linha de comando, não cole em mensagens e não grave em arquivos temporários. O script foi feito para receber o segredo interativamente e enviar diretamente ao GitHub Actions.
