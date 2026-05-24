# Identidade Visual

A identidade visual do Santorini deve reforçar que o app é o canal digital oficial da AMRTS. A logo oficial `logo-amtrs.jpg` foi adotada como marca principal e aplicada na versão Next.js, na versão estática e nos ícones de navegador.

## Ativos oficiais

| Ativo | Caminho | Uso |
|---|---|---|
| Logo original no ambiente de trabalho | `/home/ubuntu/upload/logo-amtrs.jpg` | Fonte recebida para padronização visual. |
| Logo no projeto Next.js | `public/logo-amtrs.jpg` | Exibição em componentes e páginas React. |
| Logo na versão estática | `img/logo-amtrs.jpg` | Exibição no `index.html` publicado no GitHub Pages. |
| Favicons gerados | `public/logo-amtrs-16.png`, `public/logo-amtrs-32.png`, `public/logo-amtrs-48.png` | Ícones de navegador e atalhos. |
| Apple Touch Icon | `public/logo-amtrs-180.png` | Ícone para dispositivos Apple. |
| Ícone PWA/base futura | `public/logo-amtrs-192.png`, `public/logo-amtrs-512.png` | Base para evolução PWA. |

## Aplicações implementadas

| Área | Arquivo | Decisão aplicada |
|---|---|---|
| Layout administrativo | `app/admin/layout.tsx` | Logo exibida como marca no menu/painel. |
| Layout do portal | `app/portal/layout.tsx` | Logo exibida na experiência do associado. |
| Página pública Next.js | `app/page.tsx` | Logo utilizada na identidade da entrada pública. |
| Página estática pública | `index.html` | Logo e ícones aplicados à versão GitHub Pages. |
| Metadados e favicon | `app/layout.tsx`, `app/favicon.ico`, `public/*` | Ícones de navegador e identidade visual padronizados. |

## Diretrizes de uso

A logo deve ser exibida de forma nítida, sem distorção e com contraste adequado. Em áreas de navegação, deve funcionar como elemento de reconhecimento institucional, não como ornamento excessivo. O app pode usar textos como “AMRTS Santorini” ou “Residencial Terra de Santorini” ao lado da marca, conforme o espaço disponível.

| Diretriz | Aplicação prática |
|---|---|
| Proporção | Não comprimir horizontal ou verticalmente a imagem. |
| Legibilidade | Evitar uso sobre fundos sem contraste suficiente. |
| Consistência | Usar a mesma família de ativos em Next.js e versão estática. |
| SaaS | Em multiassociação, a logo deve ser parametrizada por cliente. |
| Favicon | Manter arquivos pequenos e quadrados para melhor renderização. |

## Toggles Wide/Boxed

Os controles Wide/Boxed foram redesenhados como pills na topbar desktop. A decisão busca deixar claro que se trata de uma alternância de layout e manter consistência com a experiência mobile.

| Estado | Comportamento esperado |
|---|---|
| Wide | Conteúdo aproveita maior largura da tela. |
| Boxed | Conteúdo fica limitado a uma largura centralizada. |
| Desktop | Controle aparece na topbar em formato pill. |
| Mobile | Deve preservar interação compacta e acessível. |

## Evolução SaaS da identidade

Quando o sistema atender múltiplas associações, a identidade visual deve ser configurável por associação. A AMRTS continua sendo a implantação inicial, mas o produto deve aceitar nome, logo, cores básicas e links institucionais específicos para cada cliente.

| Configuração futura | Exemplo |
|---|---|
| `associationName` | Associação de Moradores do Residencial Terra de Santorini. |
| `brandShortName` | AMRTS. |
| `logoUrl` | Caminho público do logotipo da associação. |
| `primaryColor` | Cor institucional do cliente. |
| `publicSiteUrl` | URL de entrada pública personalizada. |

## Referências internas

[1]: registro-decisoes.md "Registro de decisões do produto"
[2]: arquitetura.md "Arquitetura técnica"
