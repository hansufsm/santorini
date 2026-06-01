#!/usr/bin/env bash
set -Eeuo pipefail

# Cadastra o segredo CONVEX_DEPLOY_KEY no GitHub Actions de forma segura.
# O valor é digitado interativamente sem eco no terminal e enviado via stdin ao gh.
# Uso:
#   ./scripts/setup-convex-deploy-key.sh
#   ./scripts/setup-convex-deploy-key.sh --repo hansufsm/santorini
#   ./scripts/setup-convex-deploy-key.sh --repo hansufsm/santorini --run-workflow

REPO="hansufsm/santorini"
SECRET_NAME="CONVEX_DEPLOY_KEY"
RUN_WORKFLOW="false"
WORKFLOW_NAME="Deploy Convex Backend"
BRANCH="main"

print_usage() {
  cat <<'USAGE'
Uso: ./scripts/setup-convex-deploy-key.sh [opções]

Opções:
  --repo OWNER/REPO       Repositório GitHub. Padrão: hansufsm/santorini
  --run-workflow          Reexecuta o workflow "Deploy Convex Backend" após salvar o segredo
  --workflow NAME         Nome do workflow a executar. Padrão: Deploy Convex Backend
  --branch BRANCH         Branch usada ao executar workflow. Padrão: main
  -h, --help              Mostra esta ajuda

Segurança:
  O script solicita a chave de forma interativa, sem exibir o valor no terminal.
  Não passe a chave como argumento de linha de comando para evitar vazamento no histórico.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO="${2:-}"
      shift 2
      ;;
    --run-workflow)
      RUN_WORKFLOW="true"
      shift
      ;;
    --workflow)
      WORKFLOW_NAME="${2:-}"
      shift 2
      ;;
    --branch)
      BRANCH="${2:-}"
      shift 2
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      echo "Erro: opção desconhecida: $1" >&2
      print_usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "$REPO" || "$REPO" != */* ]]; then
  echo "Erro: repositório inválido. Use o formato OWNER/REPO." >&2
  exit 2
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "Erro: GitHub CLI (gh) não encontrado no PATH." >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Erro: GitHub CLI não está autenticado. Execute 'gh auth login' primeiro." >&2
  exit 1
fi

echo "Repositório: $REPO"
echo "Segredo: $SECRET_NAME"
echo
printf "Cole a CONVEX_DEPLOY_KEY e pressione Enter: "
IFS= read -r -s DEPLOY_KEY
printf "\n"

if [[ -z "$DEPLOY_KEY" ]]; then
  echo "Erro: a chave informada está vazia. Nada foi alterado." >&2
  exit 1
fi

# Envia a chave por stdin. O valor não é passado por argumento e não fica no histórico do shell.
printf '%s' "$DEPLOY_KEY" | gh secret set "$SECRET_NAME" --repo "$REPO"

# Remove a variável do ambiente do processo assim que possível.
unset DEPLOY_KEY

echo
printf "Segredo '%s' cadastrado/atualizado com sucesso em %s.\n" "$SECRET_NAME" "$REPO"

if [[ "$RUN_WORKFLOW" == "true" ]]; then
  echo
  printf "Disparando workflow '%s' na branch '%s'...\n" "$WORKFLOW_NAME" "$BRANCH"
  gh workflow run "$WORKFLOW_NAME" --repo "$REPO" --ref "$BRANCH"
  echo "Workflow solicitado. Para acompanhar, execute:"
  printf "  gh run list --repo %s --limit 5\n" "$REPO"
  printf "  gh run watch --repo %s\n" "$REPO"
else
  echo
  echo "Para publicar o backend Convex agora, execute:"
  printf "  gh workflow run %q --repo %q --ref %q\n" "$WORKFLOW_NAME" "$REPO" "$BRANCH"
fi
