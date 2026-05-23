// Dashboard público — visível sem login
// Dados financeiros anonimizados buscados diretamente do Convex.
"use client";

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

// ─── Componente de card de stat com gradiente ─────────────────────────────────

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
    <div
      className={`${gradient} rounded-2xl p-5 md:p-6 shadow-xl cursor-default
        transition-transform duration-200 hover:-translate-y-1`}
    >
      <p className="text-white/80 text-sm font-medium mb-1">{label}</p>
      <h3 className="text-2xl md:text-3xl font-bold text-white">{value}</h3>
      <p className={`text-xs mt-2 ${subColor}`}>{sub}</p>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function HomePage() {
  const { data: summary, loading: loadingSummary } =
    useConvexQuery<Summary>("transactions:getSummary", {});

  const { data: assoc, loading: loadingAssoc } =
    useConvexQuery<AssociatesSummary>("associates:getAssociatesSummary", {});

  const loading = loadingSummary || loadingAssoc;

  function fmt(val: number | undefined) {
    return val !== undefined ? formatCurrency(val) : "—";
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#022c22] text-emerald-50">

      {/* ─── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-emerald-900/50 bg-[#022c22]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <span className="text-2xl select-none">🏖️</span>
            <span className="text-lg md:text-xl font-bold tracking-tight text-white">
              AMRTS <span className="text-emerald-400 italic">Santorini</span>
            </span>
          </div>

          {/* CTA */}
          <Link
            href="/login"
            className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30
              border border-emerald-500/30 text-emerald-400 hover:text-emerald-300
              px-4 py-2 rounded-xl text-sm font-bold transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Área do Associado
          </Link>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-10">

        {/* ─── Hero ───────────────────────────────────────────────────────────── */}
        <div className="relative h-44 sm:h-56 md:h-72 rounded-3xl overflow-hidden mb-8 md:mb-10 shadow-2xl border border-emerald-800/30">
          {/* Fundo degradê */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#064e3b] via-[#065f46] to-[#022c22]" />
          {/* Detalhe decorativo */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-emerald-400/10 blur-2xl" />

          {/* Conteúdo sobre o hero */}
          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
            <span className="bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3 inline-block w-fit">
              Painel Financeiro
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Residencial Santorini
            </h2>
            <p className="text-emerald-100/70 mt-2 max-w-xl text-sm leading-relaxed hidden sm:block">
              Acompanhe as contribuições, despesas e o saldo do condomínio em tempo real.
            </p>
          </div>
        </div>

        {/* ─── Cards de estatísticas ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-8 md:mb-10">

          {/* Contribuições */}
          <StatCard
            label="Total Contribuições"
            value={loading ? "..." : fmt(summary?.totalReceived)}
            sub={loading ? "" : `${summary?.receivedCount ?? 0} contribuições`}
            gradient="bg-gradient-to-br from-[#065f46] to-[#10b981]"
            subColor="text-emerald-200/70"
          />

          {/* Despesas */}
          <StatCard
            label="Despesas Pagas"
            value={loading ? "..." : fmt(summary?.totalSent)}
            sub={loading ? "" : `${summary?.sentCount ?? 0} pagamentos`}
            gradient="bg-gradient-to-br from-[#991b1b] to-[#ef4444]"
            subColor="text-red-200/70"
          />

          {/* Saldo */}
          <StatCard
            label="Saldo em Caixa"
            value={loading ? "..." : fmt(summary?.netBalance)}
            sub="Disponível para imprevistos"
            gradient="bg-gradient-to-br from-[#064e3b] to-[#059669]"
            subColor="text-emerald-200/70"
          />

          {/* Associados */}
          <div className="bg-emerald-900/30 border border-emerald-800/50 rounded-2xl p-5 md:p-6 shadow-xl backdrop-blur-sm">
            <p className="text-emerald-400 text-sm font-medium mb-1">Associados</p>
            <h3 className="text-2xl md:text-3xl font-bold text-white">
              {loading ? "..." : (assoc?.ativos ?? "—")}
            </h3>
            <p className="text-emerald-500/80 text-xs mt-2">Membros ativos</p>
          </div>
        </div>

        {/* ─── Aviso de transparência ───────────────────────────────────────── */}
        <div className="bg-emerald-900/20 border border-emerald-800/50 rounded-2xl p-4 md:p-6 mb-8 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div>
            <h4 className="text-emerald-100 font-semibold mb-1">Transparência financeira</h4>
            <p className="text-emerald-400/80 text-sm max-w-lg">
              Os valores acima são públicos e anonimizados. Associados autenticados têm acesso
              ao extrato detalhado com nomes e histórico completo.
            </p>
          </div>
          <Link
            href="/login"
            className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold
              px-6 py-3 rounded-xl transition-colors text-sm whitespace-nowrap shadow-lg shadow-emerald-900/30"
          >
            Acessar minha área →
          </Link>
        </div>

        {/* ─── Grade de recursos ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
          {[
            {
              icon: "📅",
              title: "Reservas",
              desc: "Reserve churrasqueira, salão de festas e outras áreas comuns.",
            },
            {
              icon: "📢",
              title: "Comunicados",
              desc: "Fique por dentro de avisos, obras e decisões da assembleia.",
            },
            {
              icon: "🔧",
              title: "Manutenção",
              desc: "Abra chamados e acompanhe o status das manutenções do condomínio.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-emerald-900/20 border border-emerald-800/50 rounded-2xl p-5
                backdrop-blur-sm hover:border-emerald-700/50 transition-colors"
            >
              <div className="text-3xl mb-3">{item.icon}</div>
              <h4 className="text-emerald-100 font-semibold mb-1">{item.title}</h4>
              <p className="text-emerald-400/70 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* ─── Rodapé ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-emerald-900/50 px-6 py-4 text-center text-xs text-emerald-700">
        AMRTS Santorini · {new Date().getFullYear()} · Dados públicos anonimizados
      </footer>
    </div>
  );
}
