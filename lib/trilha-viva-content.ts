export type UserRole = "sysadmin" | "diretoria" | "associado" | "morador";

export type TrilhaVivaGuide = {
  route: string;
  menuLabel: string;
  badge: string;
  title: string;
  purpose: string;
  canDo: string;
  howTo: string[];
  proTip: string;
  allowedRoles: UserRole[];
  nextActionLabel: string;
};

export const TRILHA_VIVA_GUIDES: TrilhaVivaGuide[] = [
  {
    route: "/portal/inicio",
    menuLabel: "Início",
    badge: "Boas-vindas",
    title: "Comece pelo painel de confiança",
    purpose:
      "O Início é o ponto de orientação do portal. Ele resume sua relação com a associação, mostra alertas importantes e ajuda você a decidir qual próxima ação merece atenção.",
    canDo:
      "Você pode confirmar se está usando a conta correta, acompanhar sinais rápidos do seu vínculo e navegar com segurança para as demais áreas permitidas ao seu perfil.",
    howTo: [
      "Confira seu nome, unidade e perfil exibidos no topo da tela.",
      "Observe os cards e mensagens de destaque antes de abrir uma nova solicitação.",
      "Use as abas do menu para ir diretamente ao assunto desejado sem perder contexto.",
    ],
    proTip:
      "Pense no Início como uma portaria digital: antes de agir, ele confirma quem você é, onde você está e qual caminho faz mais sentido.",
    allowedRoles: ["sysadmin", "diretoria", "associado", "morador"],
    nextActionLabel: "Ver meu panorama",
  },
  {
    route: "/portal/extrato",
    menuLabel: "Extrato",
    badge: "Financeiro",
    title: "Leia sua história financeira sem ruído",
    purpose:
      "O Extrato mostra os lançamentos financeiros ligados ao associado titular, permitindo conferir contribuições, pagamentos e movimentações importadas pela administração.",
    canDo:
      "Associados podem consultar registros financeiros próprios. Moradores vinculados não acessam esta aba, porque ela contém dados financeiros do titular.",
    howTo: [
      "Abra o Extrato quando precisar conferir pagamentos ou localizar um lançamento recente.",
      "Compare datas, descrições e valores antes de acionar a administração.",
      "Se algo parecer inconsistente, use Feedback Comunitário ou Suporte informando a data e o valor observado.",
    ],
    proTip:
      "Ao pedir ajuda sobre cobrança, copie a data e a descrição do lançamento. Isso reduz retrabalho e acelera a análise da diretoria.",
    allowedRoles: ["sysadmin", "diretoria", "associado"],
    nextActionLabel: "Conferir lançamentos",
  },
  {
    route: "/portal/mensalidade",
    menuLabel: "Mensalidade",
    badge: "Contribuição",
    title: "Transforme pagamento em previsibilidade",
    purpose:
      "Mensalidade organiza a leitura de contribuição recorrente, status financeiro e histórico recente para que o associado saiba o que acompanhar e quando agir.",
    canDo:
      "Você pode verificar a situação mensal, entender o histórico dos últimos meses e identificar rapidamente se existe algo que precisa de regularização ou conferência.",
    howTo: [
      "Confira primeiro o status destacado no topo da página.",
      "Revise o histórico mensal antes de abrir uma dúvida financeira.",
      "Use os dados apresentados para conversar com a administração de forma objetiva.",
    ],
    proTip:
      "A melhor prática é consultar a mensalidade sempre antes de enviar comprovantes ou questionamentos, pois muitos casos se resolvem pela leitura do histórico.",
    allowedRoles: ["sysadmin", "diretoria", "associado", "morador"],
    nextActionLabel: "Ver situação mensal",
  },
  {
    route: "/portal/cadastro",
    menuLabel: "Meu Cadastro",
    badge: "Identidade",
    title: "Mantenha seus dados úteis, não apenas corretos",
    purpose:
      "Meu Cadastro concentra as informações pessoais e de contato usadas pela associação para comunicação, conferência e atendimento.",
    canDo:
      "Você pode revisar seus dados e atualizar contatos permitidos, mantendo a administração capaz de localizar você quando houver avisos, reservas ou suporte.",
    howTo: [
      "Leia os dados apresentados e confirme se pertencem à sua unidade e ao seu perfil.",
      "Atualize telefone ou e-mail quando estiverem desatualizados.",
      "Se algum dado estrutural estiver errado, acione a administração pelo Suporte.",
    ],
    proTip:
      "Cadastro bom é cadastro acionável: priorize e-mail e telefone que você realmente usa no dia a dia.",
    allowedRoles: ["sysadmin", "diretoria", "associado", "morador"],
    nextActionLabel: "Revisar meus dados",
  },
  {
    route: "/portal/reservas",
    menuLabel: "Reservas",
    badge: "Áreas comuns",
    title: "Reserve com clareza e responsabilidade coletiva",
    purpose:
      "Reservas permite solicitar o uso de áreas comuns, consultar solicitações e acompanhar a organização compartilhada dos espaços do residencial.",
    canDo:
      "Você pode escolher área, data, horário e observações, registrando uma solicitação que ajuda a administração e os demais moradores a evitarem conflitos de agenda.",
    howTo: [
      "Selecione a área desejada e verifique cuidadosamente data e horário.",
      "Inclua observações quando houver detalhe relevante para portaria ou administração.",
      "Depois de enviar, acompanhe a lista de reservas para confirmar o estado da solicitação.",
    ],
    proTip:
      "Uma boa reserva antecipa dúvidas: informe finalidade, horário real de uso e qualquer necessidade especial antes que alguém precise perguntar.",
    allowedRoles: ["sysadmin", "diretoria", "associado", "morador"],
    nextActionLabel: "Planejar reserva",
  },
  {
    route: "/portal/comunicados",
    menuLabel: "Comunicados",
    badge: "Informação oficial",
    title: "Leia comunicados como decisões, não como recados soltos",
    purpose:
      "Comunicados reúne avisos oficiais da associação, como manutenções, eventos, orientações e mensagens urgentes.",
    canDo:
      "Você pode acompanhar informações publicadas pela administração, diferenciar avisos urgentes de comunicados comuns e reduzir dúvidas repetidas.",
    howTo: [
      "Leia primeiro os comunicados mais recentes e observe o tipo de aviso.",
      "Verifique se há prazos, datas, áreas afetadas ou instruções de convivência.",
      "Se um comunicado gerar dúvida prática, abra Suporte com referência ao título do aviso.",
    ],
    proTip:
      "Ao comentar um comunicado com vizinhos, cite o título e a data. Isso mantém a conversa alinhada à informação oficial.",
    allowedRoles: ["sysadmin", "diretoria", "associado", "morador"],
    nextActionLabel: "Ler avisos oficiais",
  },
  {
    route: "/portal/suporte",
    menuLabel: "Suporte",
    badge: "Atendimento",
    title: "Abra chamados que já nascem fáceis de resolver",
    purpose:
      "Suporte serve para registrar pedidos, problemas e manutenções, criando um histórico visível para acompanhamento pela comunidade e administração.",
    canDo:
      "Você pode abrir chamados com título, área, prioridade e descrição, além de acompanhar o estado dos registros existentes.",
    howTo: [
      "Escreva um título curto que descreva o problema principal.",
      "Escolha a área correta e uma prioridade proporcional ao impacto real.",
      "Na descrição, informe local exato, horário observado, recorrência e evidências úteis.",
    ],
    proTip:
      "Um chamado excelente responde quatro perguntas: onde acontece, desde quando, quem é afetado e qual risco existe se nada for feito.",
    allowedRoles: ["sysadmin", "diretoria", "associado", "morador"],
    nextActionLabel: "Abrir chamado claro",
  },
];

export function getTrilhaVivaGuide(pathname: string, role: UserRole | string | undefined) {
  const normalizedRole = role as UserRole | undefined;
  return TRILHA_VIVA_GUIDES.find((guide) => {
    const sameRoute = pathname === guide.route || pathname.startsWith(`${guide.route}/`);
    const allowed = normalizedRole ? guide.allowedRoles.includes(normalizedRole) : false;
    return sameRoute && allowed;
  });
}
