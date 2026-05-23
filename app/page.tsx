"use client";

import { useState } from "react";
import Link from "next/link";
import { useConvexQuery } from "@/lib/convex";
import { formatCurrency } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Summary = {
  totalReceived: number;
  totalSent: number;
  netBalance: number;
  receivedCount: number;
  sentCount: number;
};

type AssociatesSummary = {
  total: number;
  ativos: number;
};

// ─── Ícones SVG inline (evita dependência extra) ──────────────────────────────

function Icon({ path, className = "h-5 w-5" }: { path: string | string[]; className?: string }) {
  const paths = Array.isArray(path) ? path : [path];
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {paths.map((d, i) => (
        <path key={i} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
      ))}
    </svg>
  );
}

const ICONS = {
  menu:      "M4 6h16M4 12h16M4 18h16",
  close:     "M6 18L18 6M6 6l12 12",
  user:      ["M16 7a4 4 0 11-8 0 4 4 0 018 0z", "M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"],
  finance:   "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  bell:      ["M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"],
  doc:       ["M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"],
  people:    ["M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"],
  bag:       "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
  box:       "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4",
  calendar:  "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  wrench:    ["M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z", "M15 12a3 3 0 11-6 0 3 3 0 016 0z"],
  shield:    "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  book:      ["M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.582.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"],
  arrow:     "M17 8l4 4m0 0l-4 4m4-4H3",
  info:      ["M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"],
};

// ─── Módulos do drawer ────────────────────────────────────────────────────────

const MODULOS = [
  { key: "financeiro",  label: "Financeiro",      icon: ICONS.finance  },
  { key: "comunicados", label: "Comunicados",      icon: ICONS.bell     },
  { key: "documentos",  label: "Documentos e Atas",icon: ICONS.doc      },
  { key: "assembleias", label: "Assembleias",      icon: ICONS.people   },
];

const OPERACIONAL = [
  { key: "fornecedores", label: "Fornecedores",     icon: ICONS.bag      },
  { key: "patrimonio",   label: "Patrimônio",        icon: ICONS.box      },
  { key: "reservas",     label: "Reservas de Áreas", icon: ICONS.calendar },
  { key: "manutencao",   label: "Manutenção",         icon: ICONS.wrench   },
  { key: "visitantes",   label: "Visitantes",         icon: ICONS.shield   },
];

// ─── Componente: DrawerItem ───────────────────────────────────────────────────

function DrawerItem({
  icon,
  label,
  active = false,
  href,
  onClick,
}: {
  icon: string | string[];
  label: string;
  active?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const cls = `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
    active
      ? "bg-emerald-600/20 text-emerald-300 border border-emerald-600/30"
      : "text-emerald-600 hover:bg-emerald-900/30 hover:text-emerald-300"
  }`;

  if (href) {
    return (
      <Link href={href} className={cls}>
        <Icon path={icon} className="h-5 w-5 shrink-0" />
        {label}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={cls}>
      <Icon path={icon} className="h-5 w-5 shrink-0" />
      {label}
    </button>
  );
}

// ─── Componente: StatCard ─────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  gradient,
  subColor = "text-white/60",
}: {
  label: string;
  value: string;
  sub: string;
  gradient: string;
  subColor?: string;
}) {
  return (
    <div className={`${gradient} rounded-2xl p-4 md:p-6 shadow-xl transition-transform duration-200 hover:-translate-y-1`}>
      <p className="text-white/80 text-xs md:text-sm font-medium mb-1">{label}</p>
      <h3 className="text-xl md:text-3xl font-bold text-white">{value}</h3>
      <p className={`text-xs mt-2 ${subColor}`}>{sub}</p>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function HomePage() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: summary, loading: loadingSummary } =
    useConvexQuery<Summary>("transactions:getSummary", {});
  const { data: assoc, loading: loadingAssoc } =
    useConvexQuery<AssociatesSummary>("associates:getAssociatesSummary", {});

  const loading = loadingSummary || loadingAssoc;

  function fmt(val?: number) {
    return val !== undefined ? formatCurrency(val) : "—";
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#022c22] text-emerald-50">

      {/* ═══ OVERLAY DO DRAWER ═══════════════════════════════════════════════ */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ═══ DRAWER LATERAL ══════════════════════════════════════════════════ */}
      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-[#011a14] border-r border-emerald-900/50
          z-[70] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out
          ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Header do drawer */}
        <div className="p-4 border-b border-emerald-900/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-800/50 flex items-center justify-center shrink-0 text-lg">
            🏖️
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm leading-none">
              AMRTS <span className="text-emerald-400 italic">Santorini</span>
            </p>
            <p className="text-[10px] text-emerald-700 mt-0.5">Gestão Residencial</p>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-400 hover:bg-emerald-900/30 transition-colors shrink-0"
            title="Fechar"
          >
            <Icon path={ICONS.close} className="h-5 w-5" />
          </button>
        </div>

        {/* Itens de navegação */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 px-3 py-2">
            Módulos
          </p>
          {MODULOS.map((m) => (
            <DrawerItem
              key={m.key}
              icon={m.icon}
              label={m.label}
              href="/login"
              onClick={() => setDrawerOpen(false)}
            />
          ))}

          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 px-3 py-2 mt-2">
            Operacional
          </p>
          {OPERACIONAL.map((m) => (
            <DrawerItem
              key={m.key}
              icon={m.icon}
              label={m.label}
              href="/login"
              onClick={() => setDrawerOpen(false)}
            />
          ))}
        </nav>

        {/* Footer do drawer */}
        <div className="p-4 border-t border-emerald-900/50 space-y-1">
          <DrawerItem
            icon={ICONS.book}
            label="Documentação"
            href="https://github.com/zionsti/santorini/tree/main/docs"
          />
          <DrawerItem
            icon={ICONS.user}
            label="Área do Associado"
            href="/login"
            onClick={() => setDrawerOpen(false)}
          />
        </div>
      </aside>

      {/* ═══ NAVBAR ══════════════════════════════════════════════════════════ */}
      <nav className="sticky top-0 z-50 border-b border-emerald-900/50 bg-[#022c22]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">

          <div className="flex items-center gap-2 md:gap-3">
            {/* Hamburguer */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-900/30 transition-colors shrink-0"
              title="Menu"
              aria-label="Abrir menu de navegação"
            >
              <Icon path={ICONS.menu} className="h-5 w-5" />
            </button>

            {/* Brand */}
            <div className="flex items-center gap-2">
              <span className="text-xl select-none">🏖️</span>
              <span className="text-base md:text-xl font-bold tracking-tight text-white">
                AMRTS <span className="text-emerald-400 italic">Santorini</span>
              </span>
            </div>
          </div>

          {/* Ações à direita */}
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden sm:flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30
                border border-emerald-500/30 text-emerald-400 hover:text-emerald-300
                px-4 py-2 rounded-xl text-sm font-bold transition-all"
            >
              <Icon path={ICONS.user} className="h-4 w-4" />
              Área do Associado
            </Link>
            {/* Botão "entrar" compacto (mobile) */}
            <Link
              href="/login"
              className="sm:hidden p-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30
                text-emerald-400 transition-all"
              title="Área do Associado"
            >
              <Icon path={ICONS.user} className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ CONTEÚDO PRINCIPAL ══════════════════════════════════════════════ */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 md:py-8">

        {/* ─── Hero ──────────────────────────────────────────────────────── */}
        <div className="relative h-40 sm:h-52 md:h-72 rounded-3xl overflow-hidden mb-6 md:mb-8
          shadow-2xl border border-emerald-800/30 group">
          {/* Fundo gradiente */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#064e3b] via-[#065f46] to-[#022c22]" />
          {/* Orbs decorativos */}
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl
            group-hover:bg-emerald-500/15 transition-all duration-700" />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-emerald-400/10 blur-2xl" />

          {/* Conteúdo */}
          <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-7 md:p-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-4">
              <div>
                <span className="bg-emerald-600 text-white text-[10px] font-bold uppercase
                  tracking-widest px-3 py-1 rounded-full mb-2 md:mb-3 inline-block">
                  Painel Financeiro
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                  Residencial Santorini
                </h2>
                <p className="text-emerald-100/70 mt-1 md:mt-2 max-w-xl text-sm leading-relaxed hidden sm:block">
                  Gestão de contribuições e acompanhamento financeiro do condomínio.
                </p>
              </div>
              <div className="bg-emerald-900/40 backdrop-blur-md border border-emerald-700/30
                rounded-2xl px-4 py-2.5 text-center shrink-0">
                <span className="block text-[10px] text-emerald-400 uppercase font-semibold tracking-wide">
                  Status
                </span>
                <span className="text-emerald-300 font-bold text-sm">Em Dia</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Cards de estatísticas ────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-6 md:mb-8">
          <StatCard
            label="Total Contribuições"
            value={loading ? "..." : fmt(summary?.totalReceived)}
            sub={loading ? " " : `${summary?.receivedCount ?? 0} contribuições`}
            gradient="bg-gradient-to-br from-[#065f46] to-[#10b981]"
            subColor="text-emerald-200/70"
          />
          <StatCard
            label="Despesas Pagas"
            value={loading ? "..." : fmt(summary?.totalSent)}
            sub={loading ? " " : `${summary?.sentCount ?? 0} pagamentos`}
            gradient="bg-gradient-to-br from-[#991b1b] to-[#ef4444]"
            subColor="text-red-200/70"
          />
          <StatCard
            label="Saldo em Caixa"
            value={loading ? "..." : fmt(summary?.netBalance)}
            sub="Disponível para imprevistos"
            gradient="bg-gradient-to-br from-[#064e3b] to-[#059669]"
            subColor="text-emerald-200/70"
          />
          {/* Card glass — Associados */}
          <div className="bg-emerald-900/30 border border-emerald-800/50 rounded-2xl p-4 md:p-6
            shadow-xl backdrop-blur-sm transition-transform duration-200 hover:-translate-y-1">
            <p className="text-emerald-400 text-xs md:text-sm font-medium mb-1">Associados</p>
            <h3 className="text-xl md:text-3xl font-bold text-white">
              {loading ? "..." : (assoc?.ativos ?? "—")}
            </h3>
            <p className="text-emerald-500/80 text-xs mt-2">Membros ativos</p>
          </div>
        </div>

        {/* ─── Banner de transparência + CTA ───────────────────────────── */}
        <div className="bg-emerald-900/20 border border-emerald-800/50 rounded-2xl p-4 md:p-6 mb-6 md:mb-8
          backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div>
            <h4 className="text-emerald-100 font-semibold mb-1 flex items-center gap-2">
              <Icon path={ICONS.info} className="h-4 w-4 text-emerald-400" />
              Transparência financeira
            </h4>
            <p className="text-emerald-400/80 text-sm max-w-lg">
              Os valores acima são públicos e anonimizados. Associados autenticados têm acesso
              ao extrato detalhado com nomes e histórico completo.
            </p>
          </div>
          <Link
            href="/login"
            className="shrink-0 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500
              text-white font-bold px-5 py-2.5 rounded-xl transition-colors text-sm
              whitespace-nowrap shadow-lg shadow-emerald-900/40"
          >
            Acessar minha área
            <Icon path={ICONS.arrow} className="h-4 w-4" />
          </Link>
        </div>

        {/* ─── Grade de módulos ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          {[
            { icon: ICONS.finance,   label: "Financeiro",       desc: "Extrato e contribuições" },
            { icon: ICONS.bell,      label: "Comunicados",      desc: "Avisos do condomínio"    },
            { icon: ICONS.calendar,  label: "Reservas",         desc: "Áreas comuns"            },
            { icon: ICONS.wrench,    label: "Manutenção",       desc: "Chamados de suporte"     },
            { icon: ICONS.people,    label: "Assembleias",      desc: "Votações e atas"         },
            { icon: ICONS.doc,       label: "Documentos",       desc: "Regulamentos e contratos"},
            { icon: ICONS.bag,       label: "Fornecedores",     desc: "Prestadores de serviço"  },
            { icon: ICONS.shield,    label: "Visitantes",       desc: "Controle de acesso"      },
          ].map((item) => (
            <Link
              key={item.label}
              href="/login"
              className="bg-emerald-900/20 border border-emerald-800/50 rounded-2xl p-4
                backdrop-blur-sm hover:border-emerald-700/50 hover:bg-emerald-900/30
                transition-all group"
            >
              <Icon
                path={item.icon}
                className="h-6 w-6 text-emerald-500 group-hover:text-emerald-400 transition-colors mb-2"
              />
              <p className="text-emerald-100 text-sm font-semibold">{item.label}</p>
              <p className="text-emerald-600 text-xs mt-0.5">{item.desc}</p>
            </Link>
          ))}
        </div>

      </main>

      {/* ═══ RODAPÉ ══════════════════════════════════════════════════════════ */}
      <footer className="border-t border-emerald-900/50 mt-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-7
          flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-emerald-700">
          <p>AMRTS Santorini Dashboard &copy; {new Date().getFullYear()} — Gestão Residencial</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-emerald-400 transition-colors">
              Área do Associado
            </Link>
            <span className="text-emerald-900">·</span>
            <a
              href="https://github.com/zionsti/santorini/tree/main/docs"
              className="hover:text-emerald-400 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Documentação
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
