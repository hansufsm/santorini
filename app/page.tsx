"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { PublicSplashHero } from "@/components/public-splash-hero";

// ─── Ícones SVG ───────────────────────────────────────────────────────────────

function Icon({ d, className = "h-5 w-5" }: { d: string | string[]; className?: string }) {
  const paths = Array.isArray(d) ? d : [d];
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none"
      viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      {paths.map((p, i) => <path key={i} strokeLinecap="round" strokeLinejoin="round" d={p} />)}
    </svg>
  );
}

const IC = {
  menu:     "M4 6h16M4 12h16M4 18h16",
  close:    "M6 18L18 6M6 6l12 12",
  user:     ["M16 7a4 4 0 11-8 0 4 4 0 018 0z", "M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"],
  finance:  "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  bell:     ["M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"],
  doc:      "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  people:   ["M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"],
  bag:      "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
  box:      "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4",
  cal:      "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  wrench:   ["M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z", "M15 12a3 3 0 11-6 0 3 3 0 016 0z"],
  shield:   "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  book:     ["M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.582.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"],
  cog:      ["M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z", "M15 12a3 3 0 11-6 0 3 3 0 016 0z"],
  arrow:    "M17 8l4 4m0 0l-4 4m4-4H3",
};

// ─── Módulos de navegação (Visíveis apenas após login) ───────────────────────────

const MODULOS = [
  { key: "financeiro",   label: "Financeiro",       icon: IC.finance },
  { key: "comunicados",  label: "Comunicados",       icon: IC.bell    },
  { key: "documentos",   label: "Documentos e Atas", icon: IC.doc     },
  { key: "assembleias",  label: "Assembleias",       icon: IC.people  },
];
const OPERACIONAL = [
  { key: "fornecedores", label: "Fornecedores",      icon: IC.bag     },
  { key: "patrimonio",   label: "Patrimônio",         icon: IC.box     },
  { key: "reservas",     label: "Reservas de Áreas",  icon: IC.cal     },
  { key: "manutencao",   label: "Manutenção",          icon: IC.wrench  },
  { key: "visitantes",   label: "Visitantes",          icon: IC.shield  },
];

export default function HomePage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { session } = useAuth();

  const appHref = session
    ? session.role === "sysadmin" || session.role === "diretoria"
      ? "/admin"
      : "/portal/inicio"
    : "/login";
  const appCtaLabel = session ? "Meu painel" : "Entrar";

  return (
    <div className="min-h-screen flex flex-col page-fade"
      style={{ backgroundColor: "var(--bg-page)", color: "var(--text-primary)" }}>

      {/* ─── Overlay do drawer ───────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)} />
      )}

      {/* ─── Drawer lateral ──────────────────────────────────────────────── */}
      <aside className={`fixed left-0 top-0 h-full w-72 z-[70] flex flex-col shadow-2xl
        border-r transition-transform duration-300 ease-in-out
        ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ backgroundColor: "var(--bg-drawer)", borderColor: "var(--border-main)" }}>

        {/* Header */}
        <div className="p-4 flex items-center gap-3 border-b"
          style={{ borderColor: "var(--border-main)" }}>
          <img
            src="/logo-amtrs-48.png"
            alt="Logo AMRTS Santorini"
            className="h-10 w-10 rounded-xl object-cover shrink-0 ring-1 ring-emerald-300/30 shadow-sm"
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-none" style={{ color: "var(--text-primary)" }}>
              AMRTS <span style={{ color: "var(--text-accent)" }} className="italic">Santorini</span>
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-very-dim)" }}>Gestão Residencial</p>
          </div>
          <button onClick={() => setDrawerOpen(false)}
            className="p-1.5 rounded-lg transition-colors shrink-0 hover:bg-black/10 cursor-pointer"
            style={{ color: "var(--text-muted)" }} title="Fechar">
            <Icon d={IC.close} className="h-5 w-5" />
          </button>
        </div>

        {/* Nav items (redirecionam para área restrita) */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-widest px-3 py-2"
            style={{ color: "var(--text-very-dim)" }}>Módulos</p>
          {MODULOS.map(m => (
            <Link key={m.key} href={appHref} onClick={() => setDrawerOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                font-medium transition-all hover:bg-black/10"
              style={{ color: "var(--text-muted)" }}>
              <Icon d={m.icon} className="h-5 w-5 shrink-0" />
              {m.label}
            </Link>
          ))}

          <p className="text-[10px] font-bold uppercase tracking-widest px-3 py-2 pt-3"
            style={{ color: "var(--text-very-dim)" }}>Operacional</p>
          {OPERACIONAL.map(m => (
            <Link key={m.key} href={appHref} onClick={() => setDrawerOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                font-medium transition-all hover:bg-black/10"
              style={{ color: "var(--text-muted)" }}>
              <Icon d={m.icon} className="h-5 w-5 shrink-0" />
              {m.label}
            </Link>
          ))}
        </nav>

        {/* Footer do drawer */}
        <div className="p-4 border-t space-y-0.5"
          style={{ borderColor: "var(--border-main)" }}>
          <a href="https://github.com/zionsti/santorini/tree/main/docs"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
              font-medium transition-all hover:bg-black/10"
            style={{ color: "var(--text-dim)" }}>
            <Icon d={IC.book} className="h-4 w-4 shrink-0" />
            Documentação
          </a>
          <Link href={appHref}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
              font-medium transition-all hover:bg-black/5"
            style={{ color: "var(--text-very-dim)" }}>
            <Icon d={IC.cog} className="h-4 w-4 shrink-0" />
            {session ? "Meu painel" : "Acesso Admin"}
          </Link>
          <p className="px-3 py-1 text-[10px]" style={{ color: "var(--text-very-dim)" }}>
            v3.0 · {new Date().getFullYear()}
          </p>
        </div>
      </aside>

      {/* ─── Navbar ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-md border-b animate-none"
        style={{ backgroundColor: "var(--bg-nav)", borderColor: "var(--border-nav)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">

          {/* Esquerda: hamburguer + brand */}
          <div className="flex items-center gap-2">
            <button onClick={() => setDrawerOpen(true)}
              className="p-2 rounded-lg transition-colors hover:bg-black/10 shrink-0 cursor-pointer"
              style={{ color: "var(--text-accent)" }}
              title="Menu" aria-label="Abrir menu">
              <Icon d={IC.menu} className="h-5 w-5" />
            </button>
            <span className="flex items-center gap-2 text-base md:text-lg font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}>
              <img
                src="/logo-amtrs-32.png"
                alt="Logo AMRTS Santorini"
                className="h-7 w-7 rounded-lg object-cover ring-1 ring-emerald-300/30"
              />
              <span>
                AMRTS{" "}
                <span style={{ color: "var(--text-accent)" }} className="italic">Santorini</span>
              </span>
            </span>
          </div>

          {/* Direita: CTA principal (Entrar / Meu painel) */}
          <div className="flex items-center gap-1.5 md:gap-2">
            <Link href={appHref}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500
                text-white font-bold px-4 py-2 rounded-xl text-sm transition-all
                shadow-lg shadow-emerald-900/30 hover:scale-[1.02] active:scale-[0.98]">
              <span>{appCtaLabel}</span>
              <Icon d={IC.arrow} className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Conteúdo Principal ───────────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 md:py-8 space-y-8">
        
        {/* Hero Splash Híbrido */}
        <PublicSplashHero appHref={appHref} appCtaLabel={appCtaLabel} />

        {/* Banner de Boas-Vindas e Acesso Restrito */}
        <section
          className="rounded-3xl border p-6 md:p-8 backdrop-blur-sm flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300"
          style={{ backgroundColor: "var(--bg-module)", borderColor: "var(--border-main)" }}
        >
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-xl font-extrabold text-white tracking-tight">
              Área Restrita aos Associados
            </h3>
            <p className="text-sm leading-relaxed text-emerald-100/70 max-w-xl">
              Para preservar a segurança financeira e a privacidade dos moradores do Residencial Santorini, os demonstrativos, comunicados, reservas e atas estão protegidos.
            </p>
          </div>
          <Link
            href={appHref}
            className="w-full md:w-auto shrink-0 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3.5 rounded-xl transition-all text-sm shadow-xl shadow-emerald-950/45 hover:scale-[1.02]"
          >
            Acessar o Portal
            <Icon d={IC.arrow} className="h-4 w-4" />
          </Link>
        </section>

        {/* Recursos do Portal (Showcase Estático para Informar, sem falsos links) */}
        <section className="space-y-4">
          <div className="text-center md:text-left">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">Módulos do Santorini</h3>
            <p className="text-xs text-emerald-200/50">Conheça as ferramentas que você terá acesso após realizar o login</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: IC.finance,  label: "Painel Financeiro",   desc: "Demonstrativos de caixa, extratos, receitas e inadimplência gerencial." },
              { icon: IC.bell,     label: "Comunicados Internos", desc: "Canal oficial de avisos, comunicados urgentes e deliberações." },
              { icon: IC.cal,      label: "Reservas de Áreas",    desc: "Agendamento rápido e inteligente das áreas comuns e churrasqueira." },
              { icon: IC.wrench,   label: "Suporte e Manutenção", desc: "Abertura e acompanhamento de ordens de serviço de infraestrutura." },
              { icon: IC.people,   label: "Assembleias & Atas",   desc: "Histórico de assembleias, atas assinadas e votações da associação." },
              { icon: IC.doc,      label: "Documentos Oficiais",  desc: "Consulta ao estatuto, regulamento interno e demais arquivos legais." },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl p-5 border backdrop-blur-sm hover:scale-[1.01] transition-transform duration-300"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-main)" }}
              >
                <div className="rounded-xl bg-emerald-700/10 p-2.5 w-fit text-emerald-400 mb-3 border border-emerald-500/10">
                  <Icon d={item.icon} className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">
                  {item.label}
                </h4>
                <p className="text-xs leading-relaxed text-emerald-200/55">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* ─── Rodapé ──────────────────────────────────────────────────────── */}
      <footer className="border-t mt-8"
        style={{ borderColor: "var(--border-main)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 pb-5 flex flex-col sm:flex-row
          items-center justify-between gap-3 text-xs"
          style={{ color: "var(--text-dim)" }}>
          <p>AMRTS Santorini &copy; {new Date().getFullYear()} — Gestão Residencial</p>
          <div className="flex items-center gap-4">
            <Link href={appHref} className="transition-colors hover:opacity-80">{appCtaLabel}</Link>
            <span style={{ color: "var(--text-very-dim)" }}>·</span>
            <span className="opacity-30 cursor-not-allowed">Documentação</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
