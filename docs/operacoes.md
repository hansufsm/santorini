# Operações, Deploy e Manutenção

Este documento reúne as rotinas operacionais do Santorini, incluindo atualização do repositório, validação local, deploy da versão estática, preparação da aplicação Next.js e cuidados com o backend Convex.

## Ambientes

| Ambiente | Uso | Observação |
|---|---|---|
| Local | Desenvolvimento, validação e documentação. | Usar `npm install`, `npm run build` e comandos Convex conforme necessidade. |
| GitHub Pages | Publicação da versão estática. | Atualizado por push na branch principal, conforme workflow configurado. |
| Convex | Backend e persistência. | Deploy separado do frontend quando houver alteração em `convex/*`. |
| Vercel | Produção planejada para Next.js. | Exige variáveis de ambiente e validação de build. |

## Rotina de atualização do repositório

```bash
gh repo clone zionsti/santorini
cd santorini
git pull --ff-only origin main
git status --short
```

Antes de alterar documentação ou código, o repositório deve estar atualizado e sem pendências inesperadas. Ao concluir a tarefa, as mudanças devem ser commitadas e enviadas ao GitHub.

## Validação local

| Comando | Quando usar |
|---|---|
| `npm install` | Primeira configuração ou atualização de dependências. |
| `npm run build` | Antes de push com mudanças no Next.js. |
| `npm run convex:dev` | Quando for testar funções Convex em desenvolvimento. |
| `npm run convex:deploy` | Quando houver alteração em backend Convex para produção. |
| `git status --short` | Antes e depois de editar arquivos. |

## Deploy do frontend estático

A versão estática usa `index.html`, `script.js` e ativos em `img/`. Como está publicada no GitHub Pages, alterações nesses arquivos devem ser validadas localmente e enviadas para a branch principal. O GitHub Pages deve atualizar a publicação após o push.

| Verificação | Critério |
|---|---|
| Página inicial | Carrega sem erro visível. |
| Logo e favicon | Ativos AMRTS aparecem corretamente. |
| Login | Usuário autenticado não deve ser forçado a repetir login sem necessidade. |
| Menus | Drawer, topbar e toggles Wide/Boxed funcionam. |
| Gráficos | Bibliotecas externas carregam e renderizam dados. |

## Deploy da aplicação Next.js

A aplicação Next.js deve ser validada com `npm run build`. A publicação em Vercel deve usar as variáveis de ambiente necessárias para o Convex e manter compatibilidade com rotas do App Router.

| Etapa | Critério de aceite |
|---:|---|
| 1 | Build local conclui sem erro. |
| 2 | Rotas públicas, portal e admin carregam. |
| 3 | Login restaura sessão. |
| 4 | Chamadas Convex usam o ambiente correto. |
| 5 | Favicon e logo aparecem em produção. |

## Deploy do Convex

Alterações em `convex/schema.ts` ou funções serverless exigem deploy Convex. Mudanças que adicionem tabelas, como `feedbacks`, devem ser acompanhadas de validação de queries e mutations relacionadas.

```bash
npm run convex:deploy
```

| Alteração | Exige deploy Convex |
|---|---:|
| Novo arquivo em `convex/*` | Sim |
| Nova tabela ou índice | Sim |
| Ajuste apenas em Markdown | Não |
| Ajuste apenas em componentes React | Não, exceto se depender de nova função backend |

## Backup e dados sensíveis

Dados financeiros, CPF, usuários e sessões devem ser tratados com cautela. Arquivos CSV de importação, backups e materiais de cliente não devem ser adicionados ao repositório sem decisão explícita. Quando necessário, usar dados anonimizados para teste e documentação.

| Tipo de dado | Diretriz |
|---|---|
| CPF | Exibir apenas quando estritamente necessário e para perfis autorizados. |
| CSV financeiro | Não versionar arquivos reais sem autorização. |
| Credenciais | Nunca registrar em Markdown, código ou commits. |
| Logs | Remover dados pessoais antes de compartilhar. |
| Feedbacks | Considerar que mensagens podem conter dados pessoais. |

## Checklist para fechamento de tarefa

| Item | Esperado |
|---|---:|
| Repositório atualizado antes da edição | Sim |
| Documentação afetada revisada | Sim |
| Build executado quando houver código | Sim |
| `git status` revisado | Sim |
| Commit descritivo criado | Sim |
| Push enviado ao GitHub | Sim |
| Resumo entregue ao usuário | Sim |

## Referências internas

[1]: ../DEPLOY.md "Guia de deploy raiz"
[2]: arquitetura.md "Arquitetura técnica"
[3]: troubleshooting.md "Solução de problemas"
