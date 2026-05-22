/**
 * portal/inicio/page.tsx — Página inicial do portal
 *
 * Mostra cards de resumo do associado.
 * TODO Fase 2B: conectar os dados reais via useQuery do Convex.
 */
"use client";

import { useAuth } from "@/lib/auth";

// Card simples de estatística
function StatCard({
  emoji,
  label,
  value,
  sub,
}: {
  emoji: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="text-2xl mb-2">{emoji}</div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function InicioPage() {
  const { session } = useAuth();

  if (!session) return null;

  return (
    <div className="space-y-6">

      {/* Saudação */}
      <div>
        <h2 className="text-xl font-bold text-white">
          Olá, {session.name.split(" ")[0]}! 👋
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Bem-vindo ao seu portal de autoatendimento.
        </p>
      </div>

      {/* Cards de resumo */}
      {/* TODO Fase 2B: substituir os valores fixos por dados do Convex */}
      {/* Usar: useQuery(api.transactions.getAllTransactions) e filtrar por session.name */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          emoji="💰"
          label="Total Contribuído"
          value="—"
          sub="Carregando..."
        />
        <StatCard
          emoji="📅"
          label="Meses Ativos"
          value="—"
          sub="Carregando..."
        />
        <StatCard
          emoji="📆"
          label="Última Contribuição"
          value="—"
          sub="Carregando..."
        />
        <StatCard
          emoji="⏰"
          label="Próxima Estimada"
          value="—"
          sub="Carregando..."
        />
      </div>

      {/* Gráfico placeholder */}
      {/* TODO Fase 2B: adicionar gráfico Recharts com contribuições dos últimos 6 meses */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-4">
          📈 Contribuições — Últimos 6 meses
        </h3>
        <div className="h-32 flex items-center justify-center text-gray-600 text-sm">
          Gráfico disponível na Fase 2B
        </div>
      </div>

    </div>
  );
}
