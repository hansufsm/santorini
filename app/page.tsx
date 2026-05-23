// Dashboard público — visível sem login
// TODO Fase 2B: conectar os cards de estatísticas ao Convex
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">

      {/* Cabeçalho */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏖️</span>
          <div>
            <h1 className="font-bold text-white text-lg leading-tight">AMRTS Santorini</h1>
            <p className="text-xs text-gray-400">Gestão Residencial</p>
          </div>
        </div>
        <Link
          href="/login"
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Área do Associado
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <span className="text-6xl mb-6">🏖️</span>
        <h2 className="text-3xl font-bold text-white mb-3">
          Residencial Santorini
        </h2>
        <p className="text-gray-400 max-w-md mb-10">
          Acompanhe as finanças, faça reservas, veja comunicados e gerencie sua unidade de forma simples.
        </p>

        {/* Cards de estatísticas — placeholder, conectar ao Convex na Fase 2B */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl w-full mb-10">
          {[
            { label: "Contribuições", emoji: "💰" },
            { label: "Despesas", emoji: "📋" },
            { label: "Associados", emoji: "👥" },
            { label: "Saldo", emoji: "📊" },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center"
            >
              <div className="text-2xl mb-1">{card.emoji}</div>
              <div className="text-xs text-gray-400">{card.label}</div>
              <div className="text-lg font-bold text-gray-300 mt-1">—</div>
            </div>
          ))}
        </div>

        <Link
          href="/login"
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-3 rounded-xl transition-colors text-lg"
        >
          Acessar minha área →
        </Link>
      </main>

      {/* Rodapé */}
      <footer className="border-t border-gray-800 px-6 py-4 text-center text-xs text-gray-500">
        AMRTS Santorini · Versão 3.0 (Next.js) · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
