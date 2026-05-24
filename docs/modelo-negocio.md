# Modelo de Negócio SaaS

O Santorini deve ser conduzido como um produto SaaS para associações de moradores, com a AMRTS como cliente inicial e caso de referência. A premissa comercial aprovada é que o cliente contrata o **uso mensal do sistema**, e não a propriedade do software, permitindo manutenção contínua, evolução incremental, suporte técnico e reaproveitamento controlado da plataforma para outras associações.

> O Plano Básico aprovado para a AMRTS tem referência de **US$20/mês**, considerando o uso do dashboard financeiro/gerencial, portal do associado e evolução modular do produto.

## Estrutura de oferta

| Elemento | Plano Básico AMRTS | Diretriz de evolução SaaS |
|---|---|---|
| Cobrança | Assinatura mensal de US$20 | Planos podem variar por número de unidades, módulos e suporte. |
| Titularidade | Uso do serviço | Código, arquitetura e produto permanecem reutilizáveis para operação SaaS. |
| Cliente inicial | AMRTS | Outras associações podem ser atendidas com isolamento por associação. |
| Infraestrutura | GitHub Pages, Convex e futura Vercel | Custos devem ser considerados no orçamento recorrente. |
| Suporte | Manutenção evolutiva e corretiva proporcional ao plano | Pode evoluir para SLA, atendimento prioritário e relatórios periódicos. |
| Personalização | Identidade visual AMRTS no app inicial | Multiassociação deve permitir marca, nome e parâmetros por cliente. |

## Módulos de valor aprovados

O produto deve priorizar módulos que tragam transparência financeira, organização operacional e participação comunitária. A combinação desses módulos diferencia o sistema de uma simples planilha, pois cria histórico, acesso controlado, comunicação e rastreabilidade.

| Módulo | Valor para a associação | Estado |
|---|---|---:|
| Controle financeiro e gerencial | Transparência de receitas, despesas, contribuições e inadimplência. | Implementado e em evolução. |
| Portal do associado | Permite que moradores consultem informações próprias e consumam comunicados. | Implementado parcialmente e planejado como área dedicada. |
| Gestor de patrimônio | Organiza bens, status, localização e manutenção. | Previsto/estruturado no produto. |
| Divulgação de serviços | Permite indicação e organização de prestadores pelos moradores. | Aprovado como módulo de evolução. |
| Feedback Comunitário | Canal global de sugestões, erros, demandas e elogios. | Aprovado para MVP. |
| Multiassociação | Permite escalar o produto para outros residenciais. | Planejado como diretriz arquitetural. |

## Diretrizes para multiassociação

A evolução SaaS exige que cada registro sensível possa ser associado a uma organização cliente. A diretriz aprovada é introduzir `associationId` em novas tabelas e planejar migrações graduais nas tabelas existentes. Essa estratégia reduz risco de retrabalho quando o sistema passar de uma implantação local para uma plataforma multi-inquilino.

| Camada | Diretriz |
|---|---|
| Banco de dados | Novas tabelas devem nascer com `associationId` sempre que representarem dados de cliente. |
| Autenticação | Sessões e usuários devem carregar papel e associação de contexto. |
| Interface | Nome, logo e configurações devem ser parametrizáveis por associação. |
| Relatórios | Indicadores devem filtrar por associação antes de qualquer agregação. |
| Suporte | Feedbacks e chamados devem ser rastreados por associação e rota de origem. |

## Custos e sustentabilidade

O orçamento recorrente deve considerar hospedagem, banco, domínio, eventual envio de e-mails, armazenamento de arquivos e horas de manutenção. A documentação financeira externa já produzida deve permanecer fora do código quando contiver dados comerciais sensíveis, mas suas conclusões devem orientar o posicionamento do produto e o contrato de assinatura.

| Item de custo | Observação operacional |
|---|---|
| Hospedagem frontend | GitHub Pages atende a versão estática; Vercel é a rota natural para Next.js em produção. |
| Backend e banco | Convex concentra persistência e funções serverless. |
| Armazenamento | Será necessário para documentos, comprovantes e screenshots opcionais no futuro. |
| E-mail e notificações | Deve ser avaliado quando notificações transacionais entrarem no roadmap. |
| Suporte e evolução | Deve ser coberto pela assinatura ou por contratação adicional. |

## Referências internas

[1]: ../README.md "README principal"
[2]: registro-decisoes.md "Registro de decisões do produto"
[3]: roadmap.md "Roadmap do produto"
