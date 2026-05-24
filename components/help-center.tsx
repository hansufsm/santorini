"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { TRILHA_VIVA_GUIDES, type UserRole } from "@/lib/trilha-viva-content";

type HelpCenterVariant = "portal" | "admin";

type FaqItem = {
  question: string;
  answer: string;
  roles: UserRole[];
};

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Por que algumas áreas aparecem para um usuário e não para outro?",
    answer:
      "O Santorini filtra rotas e instruções conforme a role do usuário. Moradores recebem orientações de uso cotidiano; associados acessam também informações ligadas ao titular; diretoria e sysadmin veem instruções operacionais adicionais.",
    roles: ["morador", "associado", "diretoria", "sysadmin"],
  },
  {
    question: "Onde encontro instruções rápidas sobre uma página específica?",
    answer:
      "Nas páginas do portal, a Trilha Viva apresenta um guia contextual com finalidade, ações permitidas, passos sugeridos e técnica prática. Esta Central reúne os mesmos caminhos em formato de índice.",
    roles: ["morador", "associado", "diretoria", "sysadmin"],
  },
  {
    question: "O que devo informar ao abrir um chamado?",
    answer:
      "Informe local, data aproximada, impacto, recorrência e evidências úteis. Um chamado bem descrito reduz retrabalho e facilita a priorização pela administração.",
    roles: ["morador", "associado", "diretoria", "sysadmin"],
  },
  {
    question: "Por que moradores não veem todas as informações financeiras?",
    answer:
      "Dados financeiros do titular são protegidos. Quando a role não possui permissão para determinado conteúdo, a interface evita expor informações sensíveis e direciona o usuário para canais adequados.",
    roles: ["morador", "associado", "diretoria", "sysadmin"],
  },
  {
    question: "Como a diretoria deve acompanhar dúvidas recorrentes?",
    answer:
      "A diretoria deve cruzar Feedbacks, Suporte e painel da Trilha Viva para identificar páginas com maior dúvida, ajustar comunicados e priorizar melhorias de usabilidade.",
    roles: ["diretoria", "sysadmin"],
  },
];

const ADMIN_MANUALS = [
  {
    title: "Operação diária da diretoria",
    badge: "Administração",
    body: "Use o dashboard e as áreas de transações, associados, reservas, comunicados, manutenção e feedbacks como fila operacional. Priorize registros com impacto coletivo, risco de segurança ou prazo definido.",
  },
  {
    title: "Governança da Trilha Viva",
    badge: "Adoção",
    body: "Acompanhe o painel de Trilha Viva para localizar rotas com maior necessidade de reforço. Guias com baixa conclusão devem gerar ajustes de texto, microcopy ou fluxo.",
  },
  {
    title: "Gestão de acessos",
    badge: "Segurança",
    body: "Diretoria e sysadmin devem revisar roles com cuidado. Permissões administrativas precisam ser concedidas apenas a pessoas autorizadas pela associação.",
  },
];

function roleLabel(role?: string) {
  const labels: Record<string, string> = {
    morador: "Morador",
    associado: "Associado",
    diretoria: "Diretoria",
    sysadmin: "Sysadmin",
  };
  return role ? labels[role] ?? role : "Usuário";
}

export function HelpCenter({ variant = "portal" }: { variant?: HelpCenterVariant }) {
  const { session } = useAuth();
  const role = session?.role as UserRole | undefined;
  const guides = TRILHA_VIVA_GUIDES.filter((guide) => role && guide.allowedRoles.includes(role));
  const faqs = FAQ_ITEMS.filter((item) => role && item.roles.includes(role));
  const showAdmin = variant === "admin" && (role === "diretoria" || role === "sysadmin");

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border p-5 shadow-xl sm:p-7" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-main)" }}>
        <p className="text-xs font-bold uppercase tracking-[0.22em]" style={{ color: "var(--text-accent)" }}>
          Ajuda e Manuais
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl" style={{ color: "var(--text-primary)" }}>
              Central de orientação do Santorini
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: "var(--text-muted)" }}>
              Esta rota reúne Q&A, manuais rápidos e instruções filtradas para o perfil <strong>{roleLabel(role)}</strong>. O objetivo é substituir instruções dispersas por um ponto único, claro e acessível pelo menu.
            </p>
          </div>
          <div className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "var(--border-main)", backgroundColor: "var(--bg-module)", color: "var(--text-muted)" }}>
            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Perfil ativo</p>
            <p>{roleLabel(role)}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border p-4" style={{ backgroundColor: "var(--bg-module)", borderColor: "var(--border-main)" }}>
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>1. Encontre a área</p>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>Use o índice abaixo para abrir o módulo correspondente ao assunto.</p>
        </div>
        <div className="rounded-2xl border p-4" style={{ backgroundColor: "var(--bg-module)", borderColor: "var(--border-main)" }}>
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>2. Leia a técnica</p>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>Cada manual traz finalidade, ação permitida, passos e dica prática.</p>
        </div>
        <div className="rounded-2xl border p-4" style={{ backgroundColor: "var(--bg-module)", borderColor: "var(--border-main)" }}>
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>3. Aja com contexto</p>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>Quando precisar, use Suporte ou Feedback Comunitário informando rota e situação.</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Manuais disponíveis para seu perfil</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {guides.map((guide) => (
            <article key={guide.route} className="rounded-2xl border p-4" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-main)" }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--text-accent)" }}>{guide.badge}</p>
                  <h3 className="mt-1 font-bold" style={{ color: "var(--text-primary)" }}>{guide.menuLabel}</h3>
                </div>
                <Link href={guide.route} className="rounded-full bg-emerald-600/20 px-3 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-600/30">
                  Abrir
                </Link>
              </div>
              <p className="mt-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{guide.title}</p>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-muted)" }}>{guide.purpose}</p>
              <div className="mt-3 rounded-xl border p-3 text-sm" style={{ borderColor: "var(--border-main)", backgroundColor: "var(--bg-module)", color: "var(--text-muted)" }}>
                <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Como fazer agora</p>
                <ol className="mt-2 list-decimal space-y-1 pl-4">
                  {guide.howTo.map((step) => <li key={step}>{step}</li>)}
                </ol>
              </div>
              <p className="mt-3 text-xs leading-5" style={{ color: "var(--text-dim)" }}><strong>Técnica Santorini:</strong> {guide.proTip}</p>
            </article>
          ))}
        </div>
      </section>

      {showAdmin && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Manuais adicionais da administração</h2>
          <div className="grid gap-4 lg:grid-cols-3">
            {ADMIN_MANUALS.map((manual) => (
              <article key={manual.title} className="rounded-2xl border p-4" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-main)" }}>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--text-accent)" }}>{manual.badge}</p>
                <h3 className="mt-2 font-bold" style={{ color: "var(--text-primary)" }}>{manual.title}</h3>
                <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-muted)" }}>{manual.body}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Q&A rápido</h2>
        <div className="space-y-3">
          {faqs.map((item) => (
            <details key={item.question} className="rounded-2xl border p-4" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-main)" }}>
              <summary className="cursor-pointer font-semibold" style={{ color: "var(--text-primary)" }}>{item.question}</summary>
              <p className="mt-3 text-sm leading-6" style={{ color: "var(--text-muted)" }}>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
