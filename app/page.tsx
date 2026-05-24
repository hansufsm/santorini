"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { SiteIntroVideo } from "@/components/site-intro-video";
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
  sun:      "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
  moon:     "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z",
  arrow:    "M17 8l4 4m0 0l-4 4m4-4H3",
  cog:      ["M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z", "M15 12a3 3 0 11-6 0 3 3 0 016 0z"],
};

// ─── Módulos de navegação ─────────────────────────────────────────────────────

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

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, gradient, subColor = "text-white/60" }:
  { label: string; value: string; sub: string; gradient: string; subColor?: string }) {
  return (
    <div className={`${gradient} rounded-2xl p-4 md:p-6 shadow-xl
      transition-transform duration-200 hover:-translate-y-1`}>
      <p className="text-white/80 text-xs md:text-sm font-medium mb-1">{label}</p>
      <h3 className="text-xl md:text-3xl font-bold text-white">{value}</h3>
      <p className={`text-xs mt-2 ${subColor}`}>{sub}</p>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function HomePage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLight, setIsLight]       = useState(false);
  const [isWide, setIsWide]         = useState(false);
  const { session } = useAuth();

  // Carregar preferências salvas
  useEffect(() => {
    const savedTheme  = localStorage.getItem("snt-theme");
    const savedLayout = localStorage.getItem("snt-layout");
    const light = savedTheme === "light";
    const wide  = savedLayout === "wide";
    setIsLight(light);
    setIsWide(wide);
    if (light) document.documentElement.classList.add("theme-light");
  }, []);

  function toggleTheme() {
    const next = !isLight;
    setIsLight(next);
    document.documentElement.classList.toggle("theme-light", next);
    localStorage.setItem("snt-theme", next ? "light" : "dark");
  }

  function toggleLayout() {
    const next = !isWide;
    setIsWide(next);
    localStorage.setItem("snt-layout", next ? "wide" : "boxed");
  }

  // Página pública: não consulta nem exibe valores financeiros, dados pessoais
  // ou histórico de moradores. Informações detalhadas ficam atrás do login.

  const maxW = isWide ? "max-w-[1400px]" : "max-w-7xl";
  const appHref = session
    ? session.role === "sysadmin" || session.role === "diretoria"
      ? "/admin"
      : "/portal/inicio"
    : "/login";
  const appCtaLabel = session ? "Meu painel" : "Entrar";

  return (
    <div className="min-h-screen flex flex-col page-fade"
      style={{ backgroundColor: "var(--bg-page)", color: "var(--text-primary)" }}>
      <SiteIntroVideo />

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
            className="p-1.5 rounded-lg transition-colors shrink-0 hover:bg-black/10"
            style={{ color: "var(--text-muted)" }} title="Fechar">
            <Icon d={IC.close} className="h-5 w-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {/* Seção Módulos */}
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

          {/* Seção Operacional */}
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
          {/* Acesso admin — discreto */}
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
      <nav className="sticky top-0 z-50 backdrop-blur-md border-b"
        style={{ backgroundColor: "var(--bg-nav)", borderColor: "var(--border-nav)" }}>
        <div className={`${maxW} mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2`}>

          {/* Esquerda: hamburguer + brand */}
          <div className="flex items-center gap-2">
            <button onClick={() => setDrawerOpen(true)}
              className="p-2 rounded-lg transition-colors hover:bg-black/10 shrink-0"
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

          {/* Direita: layout toggle + tema toggle + CTA */}
          <div className="flex items-center gap-1.5 md:gap-2">

            {/* Toggle Boxed / Wide — pill otimizado para desktop */}
            <div
              className="hidden md:flex items-center gap-1 rounded-full border p-1 text-[11px] font-semibold shadow-sm"
              style={{
                backgroundColor: "var(--bg-toggle)",
                borderColor: "var(--border-main)",
              }}
              aria-label="Alternar largura de visualização"
            >
              <button
                type="button"
                onClick={() => isWide && toggleLayout()}
                aria-pressed={!isWide}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all ${
                  !isWide
                    ? "bg-emerald-600 text-white shadow shadow-emerald-900/20"
                    : "hover:bg-black/10"
                }`}
                style={isWide ? { color: "var(--text-muted)" } : {}}
                title="Usar largura padrão para leitura confortável"
              >
                <span className="h-3.5 w-3 rounded-[4px] border border-current opacity-80" />
                Boxed
              </button>
              <button
                type="button"
                onClick={() => !isWide && toggleLayout()}
                aria-pressed={isWide}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all ${
                  isWide
                    ? "bg-emerald-600 text-white shadow shadow-emerald-900/20"
                    : "hover:bg-black/10"
                }`}
                style={!isWide ? { color: "var(--text-muted)" } : {}}
                title="Usar largura ampliada para aproveitar monitores maiores"
              >
                <span className="h-3.5 w-5 rounded-[4px] border border-current opacity-80" />
                Wide
              </button>
            </div>

            {/* Toggle Tema */}
            <button onClick={toggleTheme}
              className="p-2 rounded-lg transition-colors hover:bg-black/10"
              style={{ color: "var(--text-accent)" }}
              title={isLight ? "Modo escuro" : "Modo claro"}>
              <Icon d={isLight ? IC.moon : IC.sun} className="h-5 w-5" />
            </button>

            {/* CTA principal */}
            <Link href={appHref}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500
                text-white font-bold px-3 md:px-4 py-2 rounded-xl text-sm transition-colors
                shadow-lg shadow-emerald-900/30">
              <span className="hidden sm:inline">{appCtaLabel}</span>
              <Icon d={IC.arrow} className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Conteúdo ────────────────────────────────────────────────────── */}
      <main className={`flex-1 ${maxW} mx-auto w-full px-4 sm:px-6 py-6 md:py-8`}>

        {/* Hero */}
        <div className="relative h-40 sm:h-52 md:h-72 rounded-3xl overflow-hidden mb-6 md:mb-8
          shadow-2xl group border"
          style={{ borderColor: "var(--border-main)" }}>
          {/* Imagem real do empreendimento com zoom suave no hover */}
          <img
            src="/santorini.webp"
            alt="Vista aérea do Residencial Santorini"
            className="absolute inset-0 h-full w-full object-cover object-center
              transition-transform duration-700 ease-in-out group-hover:scale-105"
          />
          {/* Overlay gradiente esmeralda sobre a foto */}
          <div className="absolute inset-0 bg-gradient-to-br
            from-[#022c22]/85 via-[#064e3b]/75 to-[#065f46]/60" />
          {/* Brilhos decorativos */}
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-emerald-500/15
            blur-3xl group-hover:bg-emerald-400/20 transition-all duration-700" />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-emerald-400/10 blur-2xl" />
          <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-7 md:p-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
              <div>
                <span className="bg-emerald-600 text-white text-[10px] font-bold uppercase
                  tracking-widest px-3 py-1 rounded-full mb-2 md:mb-3 inline-block">
                  Painel Financeiro
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                  Residencial Santorini
                </h2>
                <p className="text-emerald-100/70 mt-1 md:mt-2 max-w-xl text-sm leading-relaxed hidden sm:block">
                  Gestão de contribuições e acompanhamento financeiro do residencial.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Cards públicos sem dados financeiros ou pessoais */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-6 md:mb-8">
          <StatCard label="Financeiro"
            value="Privado"
            sub="Acesso apenas para usuários autorizados"
            gradient="bg-gradient-to-br from-[#065f46] to-[#10b981]"
            subColor="text-emerald-200/70" />
          <StatCard label="Contribuições"
            value="Seguro"
            sub="Dados individuais protegidos por login"
            gradient="bg-gradient-to-br from-[#064e3b] to-[#059669]"
            subColor="text-emerald-200/70" />
          <StatCard label="Transparência"
            value="Controlada"
            sub="Relatórios detalhados só na área autenticada"
            gradient="bg-gradient-to-br from-[#065f46] to-[#047857]"
            subColor="text-emerald-200/70" />
          <div className="rounded-2xl p-4 md:p-6 shadow-xl border
            transition-transform duration-200 hover:-translate-y-1"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-main)" }}>
            <p className="text-xs md:text-sm font-medium mb-1" style={{ color: "var(--text-accent)" }}>
              Comunidade
            </p>
            <h3 className="text-xl md:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
              Protegida
            </h3>
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>Sem exposição pública de moradores</p>
          </div>
        </div>

        {/* Banner de transparência */}
        <div className="rounded-2xl p-4 md:p-6 mb-6 md:mb-8 backdrop-blur-sm border
          flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between"
          style={{ backgroundColor: "var(--bg-module)", borderColor: "var(--border-main)" }}>
          <div>
            <h4 className="font-semibold mb-1 text-sm" style={{ color: "var(--text-primary)" }}>
              Transparência financeira
            </h4>
            <p className="text-sm max-w-lg" style={{ color: "var(--text-muted)" }}>
              Por segurança, esta página não exibe valores financeiros nem dados de moradores.
              Associados autorizados acessam apenas suas próprias informações após login.
            </p>
          </div>
          <Link href={appHref}
            className="shrink-0 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500
              text-white font-bold px-5 py-2.5 rounded-xl transition-colors text-sm
              whitespace-nowrap shadow-lg shadow-emerald-900/30">
            Acessar minha área
            <Icon d={IC.arrow} className="h-4 w-4" />
          </Link>
        </div>

        {/* Grade de módulos */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {[
            { icon: IC.finance,  label: "Financeiro",       desc: "Extrato e contribuições"    },
            { icon: IC.bell,     label: "Comunicados",      desc: "Avisos do residencial"       },
            { icon: IC.cal,      label: "Reservas",         desc: "Áreas comuns"                },
            { icon: IC.wrench,   label: "Manutenção",       desc: "Chamados de suporte"         },
            { icon: IC.people,   label: "Assembleias",      desc: "Votações e atas"             },
            { icon: IC.doc,      label: "Documentos",       desc: "Regulamentos e contratos"    },
            { icon: IC.bag,      label: "Fornecedores",     desc: "Prestadores de serviço"      },
            { icon: IC.shield,   label: "Visitantes",       desc: "Controle de acesso"          },
          ].map(item => (
            <Link key={item.label} href={appHref}
              className="rounded-2xl p-4 border backdrop-blur-sm transition-all group"
              style={{ backgroundColor: "var(--bg-module)", borderColor: "var(--border-main)" }}>
              <Icon d={item.icon} className="h-6 w-6 mb-2 transition-colors"
                style={{ color: "var(--text-muted)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {item.label}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>
                {item.desc}
              </p>
            </Link>
          ))}
        </div>
      </main>

      {/* ─── Rodapé ──────────────────────────────────────────────────────── */}
      <footer className="border-t mt-4"
        style={{ borderColor: "var(--border-main)" }}>
        <div className={`${maxW} mx-auto px-4 sm:px-6 pt-5 pb-3 flex flex-col sm:flex-row
          items-center justify-between gap-3 text-xs`}
          style={{ color: "var(--text-dim)" }}>
          <p>AMRTS Santorini &copy; {new Date().getFullYear()} — Gestão Residencial</p>
          <div className="flex items-center gap-4">
            <Link href={appHref} className="transition-colors hover:opacity-80">{appCtaLabel}</Link>
            <span style={{ color: "var(--text-very-dim)" }}>·</span>
            {/* Documentação temporariamente desabilitada */}
            <span className="opacity-30 cursor-not-allowed">Documentação</span>
          </div>
        </div>
        {/* Linha de versão — só aparece em produção (Vercel injeta o hash do commit) */}
        {process.env.NEXT_PUBLIC_GIT_COMMIT && (
          <p className={`${maxW} mx-auto px-4 sm:px-6 pb-4 text-center font-mono`}
            style={{ color: "var(--text-very-dim)", fontSize: "0.7rem" }}>
            v{process.env.NEXT_PUBLIC_GIT_COMMIT}&nbsp;&nbsp;—&nbsp;&nbsp;{process.env.NEXT_PUBLIC_BUILD_TIME}
          </p>
        )}
      </footer>
    </div>
  );
}
