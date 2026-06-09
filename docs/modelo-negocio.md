# Modelo de APP

O Santorini deve ser conduzido como um App para associações de moradores, que é uma organização sem fins lucrativos, sob a sigla AMRTS. O software permite manutenção contínua, evolução incremental, suporte técnico e reaproveitamento controlado da plataforma para outras associações.

> O escopo aprovado para a AMRTS tem como referência o uso do dashboard financeiro/gerencial, portal do associado e evolução modular do App.

## Estrutura de oferta

| Elemento | Escopo AMRTS | Diretriz de evolução |
| --- | --- | --- |
| Titularidade | Uso do serviço | Código, arquitetura e App permanecem reutilizáveis para operação do App. |
| Cliente inicial | AMRTS | Outras associações podem ser atendidas com isolamento por associação. |
| Infraestrutura | GitHub Pages, Convex e futura Vercel | Recursos técnicos são considerados no planejamento do App. |
| Suporte | Manutenção evolutiva e corretiva | Pode evoluir para atendimento estruturado e relatórios periódicos. |
| Personalização | Identidade visual AMRTS no app inicial | Multiassociação deve permitir marca, nome e parâmetros por cliente. |

## Módulos de valor aprovados

O App deve priorizar módulos que tragam transparência financeira, organização operacional e participação comunitária. A combinação desses módulos diferencia o sistema de uma simples planilha, pois cria histórico, acesso controlado, comunicação e rastreabilidade.

| Módulo | Valor para a associação | Estado |
| --- | --- | --- |
| Controle financeiro e gerencial | Transparência de receitas, despesas, contribuições e inadimplência. | Implementado e em evolução. |
| Portal do associado | Permite que moradores consultem informações próprias e consumam comunicados. | Implementado parcialmente e planejado como área dedicada. |
| Gestor de patrimônio | Organiza bens, status, localização e manutenção. | Previsto/estruturado no App. |
| Divulgação de serviços | Permite indicação e organização de prestadores pelos moradores. | Aprovado como módulo de evolução. |
| Feedback Comunitário | Canal global de sugestões, erros, demandas e elogios. | Aprovado para MVP. |
| Multiassociação | Permite escalar o App para outros residenciais. | Planejado como diretriz arquitetural. |

## Diretrizes para multiassociação

A evolução do App exige que cada registro sensível possa ser associado a uma organização cliente. A diretriz aprovada é introduzir `associationId` em novas tabelas e planejar migrações graduais nas tabelas existentes. Essa estratégia reduz risco de retrabalho quando o sistema passar de uma implantação local para uma plataforma multi-inquilino.

| Camada | Diretriz |
| --- | --- |
| Banco de dados | Novas tabelas devem nascer com `associationId` sempre que representarem dados de cliente. |
| Autenticação | Sessões e usuários devem carregar papel e associação de contexto. |
| Interface | Nome, logo e configurações devem ser parametrizáveis por associação. |
| Relatórios | Indicadores devem filtrar por associação antes de qualquer agregação. |
| Suporte | Feedbacks e chamados devem ser rastreados por associação e rota de origem. |

## Sustentabilidade operacional

O planejamento deve considerar hospedagem, banco, domínio, eventual envio de e-mails, armazenamento de arquivos e horas de manutenção. A documentação técnica externa já produzida deve permanecer fora do código quando contiver dados sensíveis, mas suas conclusões devem orientar o posicionamento do App.

| Item operacional | Observação |
| --- | --- |
| Hospedagem frontend | GitHub Pages atende a versão estática; Vercel é a rota natural para Next.js em produção. |
| Backend e banco | Convex concentra persistência e funções serverless. |
| Armazenamento | Será necessário para documentos, comprovantes e screenshots opcionais no futuro. |
| E-mail e notificações | Deve ser avaliado quando notificações transacionais entrarem no roadmap. |
| Suporte e evolução | Deve ser coberto pelo planejamento do App. |

## Referências internas

[1]:../README.md "README principal"
[2]: registro-decisoes.md "Registro de decisões do App"
[3]: roadmap.md "Roadmap do App"
