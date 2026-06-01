# Manual do Sysadmin: Gerenciamento de Usuários e Vínculos Financeiros

**Sistema:** AMRTS Santorini  
**Público-alvo:** Sysadmin  
**Autor:** Manus AI  
**Data:** 01/06/2026

## 1. Objetivo do manual

Este manual descreve o processo recomendado para o **sysadmin** cadastrar, editar, revisar, inativar e reativar usuários no Santorini, com foco especial no novo fluxo de **vínculo financeiro automático**. O objetivo é garantir que cada usuário do tipo **Associado** ou **Morador** fique corretamente ligado ao cadastro financeiro do titular, pois esse vínculo sustenta o acesso ao portal, a senha inicial por CPF, a rastreabilidade por unidade e a consulta de inadimplência.

> **Definição operacional:** no Santorini, o **cadastro financeiro** é o registro do titular financeiro da unidade. O usuário do sistema é a conta de acesso. Um usuário do tipo **Associado** deve apontar para o próprio cadastro financeiro; um usuário do tipo **Morador** deve apontar para o titular financeiro da unidade.

## 2. Conceitos essenciais

O painel de usuários separa duas responsabilidades que antes podiam ser confundidas. O **usuário** é a conta que entra no sistema por e-mail e senha. O **associado financeiro vinculado** é o registro financeiro que contém titular, CPF e unidade. A relação entre os dois é indispensável para perfis operacionais, porque a senha inicial automática de associado ou morador depende do CPF completo do titular financeiro vinculado.

| Conceito | O que significa | Onde aparece | Por que importa |
|---|---|---|---|
| **Usuário do sistema** | Conta de acesso com nome, e-mail, papel e status. | `Admin → Usuários`. | Permite autenticação, permissões e acesso ao painel ou portal. |
| **Cadastro financeiro** | Registro do titular financeiro, com CPF, unidade e status financeiro. | Campo **Associado financeiro vinculado** ou **Titular financeiro da unidade**. | Define CPF de autenticação, unidade e rastreabilidade. |
| **Vínculo financeiro** | Ligação entre a conta de usuário e o cadastro financeiro correto. | Coluna **Vínculo financeiro** na tabela de usuários. | Evita usuários “sem vínculo” e permite senha inicial por CPF. |
| **Unidade** | Identificador operacional, como casa, apartamento ou lote. | Campo **Unidade derivada ou informada**. | Agrupa moradores e apoia a verificação de inadimplência. |

## 3. Papéis de usuário e permissões

O Santorini trabalha com quatro papéis principais. O sysadmin é o perfil com maior responsabilidade administrativa e deve usar o painel de usuários para manter a base consistente. Diretoria pode operar perfis comuns quando autorizada, enquanto associado e morador acessam o portal residencial.

| Papel | Finalidade | Quem pode cadastrar/editar | Observações |
|---|---|---|---|
| **Sysadmin** | Administração técnica e gestão completa do sistema. | Apenas sysadmin. | Há limite operacional de até 2 sysadmins ativos. |
| **Diretoria** | Administração institucional e operacional. | Sysadmin. | Deve ter senha manual definida pelo sysadmin. |
| **Associado** | Titular financeiro ou associado principal da unidade. | Sysadmin; diretoria conforme permissões. | Deve ter vínculo financeiro com o próprio cadastro financeiro. |
| **Morador** | Usuário vinculado à unidade de um titular financeiro. | Sysadmin; diretoria conforme permissões. | Deve ter vínculo com o titular financeiro da unidade. |

## 4. Regra central do novo fluxo

A regra central é simples: **associado e morador não devem ser criados sem vínculo financeiro**. Ao preencher o nome, a unidade ou o papel do usuário, o painel tenta localizar automaticamente uma correspondência segura no cadastro financeiro. Quando encontra uma correspondência única, o vínculo é sugerido ou aplicado. Quando não encontra uma correspondência segura, o sysadmin deve escolher manualmente o cadastro financeiro correto antes de salvar.

> **Regra de segurança:** o sistema só deve autovincular quando houver correspondência segura. Se houver dúvida, ausência de cadastro financeiro ou ambiguidade entre unidades/nomes, o sysadmin deve revisar e selecionar manualmente.

| Situação | Comportamento esperado | Ação do sysadmin |
|---|---|---|
| Nome do usuário coincide exatamente com um cadastro financeiro ativo. | O sistema sugere ou aplica o vínculo correspondente. | Confirmar a sugestão e salvar. |
| Unidade informada coincide com uma única unidade ativa no cadastro financeiro. | O sistema sugere o titular financeiro daquela unidade. | Confirmar se é o titular correto e salvar. |
| Existem vários cadastros possíveis para a mesma unidade ou nome semelhante. | O sistema evita autovínculo inseguro. | Selecionar manualmente o titular correto. |
| Não existe cadastro financeiro correspondente. | O sistema não consegue criar corretamente associado/morador com senha automática por CPF. | Criar ou corrigir antes o cadastro financeiro. |

## 5. Como cadastrar um novo usuário

Para cadastrar um usuário, acesse **Admin → Usuários** e use o bloco **Novo Usuário**. Informe o nome completo, e-mail, papel, senha quando aplicável e unidade. Para **Associado** e **Morador**, observe sempre o painel de vínculo financeiro antes de clicar em **Criar Usuário**.

### 5.1 Cadastro de associado

O papel **Associado** deve ser usado quando a pessoa é o próprio titular financeiro. Nesse caso, o campo **Associado financeiro vinculado** deve apontar para o cadastro financeiro da própria pessoa. Se o nome digitado coincidir com um cadastro financeiro ativo, o painel poderá sugerir automaticamente o vínculo.

| Campo | Preenchimento recomendado |
|---|---|
| **Nome** | Nome completo do associado, preferencialmente igual ao cadastro financeiro. |
| **E-mail** | E-mail de acesso do associado. |
| **Senha** | Pode ficar em branco se o vínculo financeiro estiver correto; a senha inicial será o CPF completo do titular, somente números. |
| **Papel** | Selecionar **Associado**. |
| **Associado financeiro vinculado** | Confirmar sugestão automática ou selecionar manualmente o cadastro financeiro correto. |
| **Unidade derivada ou informada** | Normalmente será preenchida a partir do vínculo financeiro; revisar antes de salvar. |

### 5.2 Cadastro de morador

O papel **Morador** deve ser usado para alguém que acessa o portal da unidade, mas não é necessariamente o titular financeiro. Nesse caso, o campo **Titular financeiro da unidade** deve apontar para o titular financeiro responsável pela unidade.

| Campo | Preenchimento recomendado |
|---|---|
| **Nome** | Nome completo do morador. |
| **E-mail** | E-mail de acesso do morador. |
| **Senha** | Pode ficar em branco se o titular financeiro estiver vinculado; a senha inicial será o CPF completo do titular financeiro, somente números. |
| **Papel** | Selecionar **Morador**. |
| **Titular financeiro da unidade** | Confirmar sugestão automática por unidade ou selecionar manualmente o titular correto. |
| **Unidade derivada ou informada** | Conferir se corresponde à unidade do titular financeiro. |

### 5.3 Cadastro de diretoria ou sysadmin

Perfis administrativos não usam senha inicial automática por CPF. Para **Diretoria** e **Sysadmin**, o sysadmin deve definir uma senha manual no momento do cadastro ou redefini-la posteriormente na edição do usuário.

| Papel administrativo | Senha | Vínculo financeiro |
|---|---|---|
| **Diretoria** | Obrigatória e definida manualmente. | Pode ter unidade informativa, mas não depende de vínculo financeiro para autenticação. |
| **Sysadmin** | Obrigatória e definida manualmente. | Não deve ser vinculado automaticamente a cadastro financeiro. |

## 6. Como interpretar o bloco de vínculo financeiro

Ao cadastrar ou editar um usuário associado/morador, o painel mostra uma área explicativa abaixo do seletor de vínculo. Essa área informa uma de três situações: vínculo atual, sugestão automática ou ausência de vínculo seguro.

| Mensagem no painel | Significado | Próxima ação |
|---|---|---|
| **Vínculo atual: [nome] · CPF [prefixo]… · Unidade [unidade]** | O usuário já está ligado a um cadastro financeiro. | Conferir se o titular está correto; se sim, salvar. |
| **Sugestão automática: [nome] · CPF [prefixo]… · Unidade [unidade]** | O sistema encontrou uma correspondência segura, mas ainda pode exigir confirmação visual. | Clicar em **Aplicar vínculo sugerido** e salvar. |
| **Nenhum vínculo seguro identificado automaticamente** | O sistema não encontrou correspondência única por nome ou unidade. | Selecionar manualmente o cadastro financeiro no seletor. |

O botão **Aplicar vínculo sugerido** deve ser usado quando o painel encontrou a pessoa ou titular correto. O botão **Alterar manualmente** limpa o vínculo atual e permite escolher outro cadastro financeiro. Essa opção deve ser usada quando o vínculo sugerido estiver incorreto ou quando o sysadmin precisar corrigir uma relação já existente.

## 7. Como editar um usuário existente

Para editar um usuário, localize-o na tabela de usuários e clique em **Editar**. Somente o sysadmin deve alterar cadastro, papel, vínculo de unidade e senha de outros usuários. Na edição, o campo **Nova senha** é opcional: preencha apenas se quiser redefinir a senha daquele usuário.

| Cenário de edição | Procedimento recomendado |
|---|---|
| Usuário aparece **sem vínculo**. | Clique em **Editar**, revise nome/unidade, aplique a sugestão automática se houver ou selecione manualmente o cadastro financeiro correto. |
| Vínculo aponta para titular errado. | Clique em **Alterar manualmente**, escolha o titular correto e salve. |
| Papel foi cadastrado incorretamente. | Altere o papel e revise o vínculo financeiro, pois o tipo de vínculo muda entre associado e morador. |
| Usuário esqueceu senha. | Informe uma nova senha no campo **Nova senha** e salve. |
| E-mail está errado. | Corrija o e-mail e salve; o login por e-mail dependerá do novo endereço. |

## 8. Login do usuário após o cadastro

Existem dois fluxos de login, e eles não têm a mesma finalidade. A aba **Associado / Morador** consulta diretamente o CPF no cadastro financeiro. A aba **E-mail + senha** autentica uma conta de usuário criada no painel administrativo.

| Aba de login | Quando usar | Credenciais |
|---|---|---|
| **Associado / Morador** | Quando a pessoa vai acessar diretamente pelo CPF existente no cadastro financeiro. | CPF do titular financeiro. |
| **E-mail + senha** | Quando o usuário foi criado pelo sysadmin ou diretoria. | E-mail cadastrado e senha definida. Para primeiro acesso de associado/morador, usar CPF completo do titular financeiro como senha inicial, somente números. |

Se o usuário recém-criado tentar entrar pela aba **Associado / Morador** e receber **“CPF não encontrado no cadastro”**, isso indica que o CPF não foi localizado no cadastro financeiro usado por aquela aba. Para contas criadas pelo sysadmin, oriente o usuário a entrar pela aba **E-mail + senha**.

## 9. Senha inicial por CPF

Para usuários **Associado** e **Morador**, quando o campo senha fica em branco e existe vínculo financeiro correto, a senha inicial esperada é o **CPF completo do titular financeiro, somente números**. A tela de login aceita CPF digitado com ou sem pontuação no campo de senha, mas a orientação operacional deve ser usar apenas números para reduzir erro de digitação.

| Perfil | Quem fornece o CPF usado como senha inicial | Exemplo de orientação ao usuário |
|---|---|---|
| **Associado** | O próprio titular financeiro vinculado. | “Entre pela aba E-mail + senha. Use seu e-mail cadastrado e seu CPF completo, somente números, como senha inicial.” |
| **Morador** | O titular financeiro da unidade vinculada. | “Entre pela aba E-mail + senha. Use seu e-mail cadastrado e o CPF completo do titular financeiro da unidade, somente números, como senha inicial.” |
| **Diretoria/Sysadmin** | Não se aplica. | “Use a senha definida manualmente pelo sysadmin.” |

## 10. Consulta e auditoria visual na tabela de usuários

A tabela de usuários passou a destacar o vínculo financeiro em coluna própria. Essa coluna informa se o usuário é **Titular**, **Morador da unidade** ou **Sem vínculo**, além de exibir o nome do cadastro financeiro e o prefixo do CPF quando disponível.

| Coluna | Como usar na conferência |
|---|---|
| **Nome** | Verifique se corresponde à pessoa que receberá acesso. |
| **E-mail** | Confirme se é o e-mail correto para login. |
| **Papel** | Confirme se o perfil corresponde à função real da pessoa. |
| **Unidade** | Confirme se a unidade está coerente com o cadastro financeiro. |
| **Vínculo financeiro** | Verifique se aparece **Titular** ou **Morador da unidade** para perfis operacionais. |
| **Status** | Confirme se o usuário está ativo ou inativo. |
| **Ações** | Use **Editar**, **Inativar** ou **Reativar** conforme necessário. |

O campo de busca permite localizar usuários por nome, e-mail, unidade, titular ou CPF parcial. Essa busca deve ser usada sempre que houver dúvida sobre duplicidade, vínculo incorreto ou cadastro criado em nome semelhante.

## 11. Inativação e reativação

O sistema não deve excluir usuários operacionais em rotina normal. Quando um acesso não deve mais ser usado, utilize **Inativar**. Se o acesso voltar a ser necessário, utilize **Reativar**. Essa prática preserva histórico e reduz risco de perda de rastreabilidade.

| Ação | Quando usar | Consequência prática |
|---|---|---|
| **Inativar** | Usuário não deve mais acessar o sistema. | O acesso é bloqueado, mas o histórico permanece. |
| **Reativar** | Usuário deve voltar a acessar. | A conta volta ao status ativo. |
| **Editar senha** | Usuário perdeu acesso ou senha inicial não funcionou. | A nova senha passa a ser usada na aba **E-mail + senha**. |

## 12. Checklist recomendado antes de salvar

Antes de criar ou editar um usuário, o sysadmin deve fazer uma verificação curta. Esse procedimento evita a criação de usuários sem vínculo e reduz chamados de acesso.

| Verificação | Associado | Morador | Diretoria/Sysadmin |
|---|---:|---:|---:|
| Nome completo revisado | Sim | Sim | Sim |
| E-mail correto | Sim | Sim | Sim |
| Papel correto | Sim | Sim | Sim |
| Vínculo financeiro selecionado | Sim | Sim | Não obrigatório |
| Unidade coerente com titular | Sim | Sim | Informativa |
| Senha manual preenchida | Opcional | Opcional | Sim |
| Orientação de login definida | E-mail + senha, CPF do titular como senha inicial | E-mail + senha, CPF do titular como senha inicial | E-mail + senha manual |

## 13. Casos frequentes e solução

| Problema observado | Causa provável | Solução recomendada |
|---|---|---|
| Usuário aparece **sem vínculo**. | Foi criado sem selecionar o cadastro financeiro, ou o autovínculo não encontrou correspondência segura. | Editar usuário, aplicar sugestão automática ou selecionar manualmente o titular correto. |
| Usuário não consegue entrar com CPF como senha. | Pode estar usando a aba errada ou o usuário não tem vínculo financeiro correto. | Orientar entrada pela aba **E-mail + senha** e revisar o vínculo financeiro no painel. |
| Aba **Associado / Morador** mostra “CPF não encontrado”. | O CPF não existe no cadastro financeiro consultado por essa aba. | Conferir se o cadastro financeiro existe e está ativo; para usuários criados pelo sysadmin, usar **E-mail + senha**. |
| Sistema não sugere vínculo automático. | Nome ou unidade não teve correspondência única e segura. | Selecionar manualmente no campo de vínculo. |
| A senha automática por CPF não funciona. | Backend ainda não publicado, CPF incompleto no cadastro financeiro ou vínculo incorreto. | Verificar vínculo, CPF completo do titular e status do deploy Convex. |
| Morador foi vinculado ao titular errado. | Unidade ou seleção manual incorreta. | Editar, alterar manualmente o titular financeiro e salvar. |

## 14. Observação sobre publicação do backend Convex

A interface do painel já pode exibir as melhorias de sugestão e revisão de vínculo quando o frontend estiver publicado. Entretanto, a blindagem de servidor — isto é, o backend preencher ou exigir o vínculo mesmo que o frontend não envie corretamente — depende do deploy do Convex. Se o workflow de backend estiver bloqueado por falta do segredo **`CONVEX_DEPLOY_KEY`**, a aplicação pode apresentar parte visual atualizada, mas o reforço no servidor ainda não estará ativo.

> **Procedimento administrativo:** se houver mudanças em arquivos `convex/**`, confirme se o segredo `CONVEX_DEPLOY_KEY` está configurado no GitHub Actions e reexecute o workflow de deploy do backend. Sem isso, alterações de backend não entram em produção.

| Componente | O que publica | Dependência |
|---|---|---|
| **GitHub Pages / frontend** | Tela de usuários, textos de ajuda, botões e sugestões visuais. | Workflow de frontend concluído. |
| **Convex / backend** | Regras de criação, edição, senha inicial por CPF e validações de vínculo no servidor. | `CONVEX_DEPLOY_KEY` configurado e workflow Convex concluído. |

## 15. Processo recomendado para corrigir usuário já criado sem vínculo

Quando um usuário já aparece na tabela como **Sem vínculo**, siga este fluxo operacional. Primeiro, confirme se existe cadastro financeiro correspondente em **Associados**. Depois, volte para **Usuários**, clique em **Editar** e confira se o painel sugere automaticamente o titular. Se a sugestão estiver correta, clique em **Aplicar vínculo sugerido**. Se não houver sugestão, escolha o titular manualmente no seletor. Por fim, salve e oriente o usuário a entrar pela aba **E-mail + senha**.

| Passo | Ação | Resultado esperado |
|---|---|---|
| 1 | Confirmar cadastro financeiro ativo. | Titular existe e possui CPF completo. |
| 2 | Abrir **Usuários → Editar**. | Formulário de edição aparece. |
| 3 | Conferir sugestão automática. | Sistema mostra titular provável, se houver correspondência segura. |
| 4 | Aplicar sugestão ou selecionar manualmente. | Campo de vínculo passa a mostrar titular correto. |
| 5 | Salvar alterações. | Coluna **Vínculo financeiro** deixa de mostrar **Sem vínculo**. |
| 6 | Orientar login. | Usuário entra por **E-mail + senha** com CPF do titular como senha inicial, salvo se senha manual foi definida. |

## 16. Boas práticas para o sysadmin

O sysadmin deve tratar o vínculo financeiro como dado obrigatório para qualquer conta operacional. Sempre que possível, use o nome completo conforme cadastro financeiro e informe a unidade de forma padronizada. Se houver homônimos, nomes incompletos ou unidades ambíguas, não confie apenas na sugestão automática; confira CPF parcial, unidade e titular antes de salvar.

Também é recomendável evitar senhas manuais para associado/morador quando o vínculo financeiro está correto, porque a senha inicial por CPF reduz a necessidade de comunicação individual de senha. Para perfis administrativos, porém, a senha manual continua obrigatória e deve ser definida com cuidado.

## 17. Resumo executivo do novo processo

O novo processo torna o cadastro mais seguro porque impede ou reduz a criação de usuários operacionais sem vínculo financeiro. O painel tenta identificar o vínculo automaticamente por nome ou unidade, mas mantém o controle final nas mãos do sysadmin. A tabela de usuários mostra explicitamente se a conta está vinculada como titular, morador da unidade ou sem vínculo, facilitando auditoria e correção.

| Decisão operacional | Regra prática |
|---|---|
| Criar associado | Vincular ao próprio cadastro financeiro. |
| Criar morador | Vincular ao titular financeiro da unidade. |
| Criar diretoria/sysadmin | Definir senha manual; vínculo financeiro não é obrigatório. |
| Senha em branco para associado/morador | Usa CPF completo do titular financeiro como senha inicial, desde que backend esteja publicado e vínculo/CPF estejam corretos. |
| Usuário sem vínculo | Editar e vincular antes de orientar acesso. |
| Login de usuário criado pelo painel | Usar aba **E-mail + senha**, não a aba **Associado / Morador**. |

## Referências internas

[1]: `app/admin/usuarios/page.tsx` — Tela administrativa de usuários, regras visuais de autovínculo, edição, busca e tabela.  
[2]: `convex/users.ts` — Regras de backend para criação, atualização, vínculo financeiro e senha inicial por CPF.  
[3]: `app/login/page.tsx` — Fluxos de login por CPF e por e-mail + senha.  
[4]: `DEPLOY.md` — Procedimento de deploy e dependência do `CONVEX_DEPLOY_KEY` para publicação do backend Convex.
