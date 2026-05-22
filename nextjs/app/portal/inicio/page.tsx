/**
 * portal/inicio/page.tsx — Página inicial do portal do associado
 * Mostra resumo financeiro pessoal e histórico recente.
 */
"use client";

import { useAuth } from "@/lib/auth";
import { useConvexQuery } from "@/lib/convex";
import { formatCurrency, formatDate, addDays, currentMonthKey } from "@/lib/utils";

// Tipo retornado por transactions:getAssociateHistory
type HistoryData = {
  name: string;
  total: number;
  monthsActive: number;
  lastDate: string;
  transactions: Array<{
    date: string;
    time: string;
    value: number;
    detail: string;
    type: string;
    name: string;
  }>;
} | null;

// Card de estatística simples
function StatCard({ emoji, label, value, sub }: { emoji: string; label: string; value: string; sub?: string }) {
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

  // Buscar histórico financeiro pelo nome do associado
  const { data, loading, error } = useConvexQuery<HistoryData>(
    "transactions:getAssociateHistory",
    { search: session?.name ?? "" },
    !session // pular a query enquanto a sessão não carregou
  );

  if (!session) return null;

  if (loading) {
    return <div className="text-gray-400 text-center py-12">Carregando dados financeiros…</div>;
  }

  if (error) {
    return <div className="text-red-400 text-center py-12">Erro ao carregar dados: {error}</div>;
  }

  // Verificar se há pagamento no mês atual
  const thisMonth = currentMonthKey();
  const paidThisMonth = data?.transactions.some((t) => t.date.startsWith(thisMonth));

  // Estimar próxima contribuição (30 dias após a última)
  const nextEstimated = data?.lastDate ? addDays(data.lastDate, 30) : null;

  return (
    <div className="space-y-6">

      {/* Saudação */}
      <div>
        <h2 className="text-xl font-bold text-white">
          Olá, {session.name.split(" ")[0]}! 👋
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Unidade <strong className="text-white">{session.unit}</strong> — bem-vindo ao seu portal.
        </p>
      </div>

      {/* Status do mês atual */}
      <div className={`rounded-xl p-4 border ${paidThisMonth ? "bg-emerald-900/30 border-emerald-700" : "bg-yellow-900/30 border-yellow-700"}`}>
        <p className="text-sm font-medium text-white">
          {paidThisMonth ? "✅ Mensalidade em dia" : "⚠️ Mensalidade pendente"}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {paidThisMonth
            ? "Sua contribuição deste mês foi recebida."
            : "Não identificamos contribuição no mês atual."}
        </p>
      </div>

      {/* Cards de resumo */}
      {data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard emoji="💰" label="Total Contribuído" value={formatCurrency(data.total)} />
          <StatCard emoji="📅" label="Meses Ativos" value={String(data.monthsActive)} />
          <StatCard emoji="📆" label="Última Contribuição" value={formatDate(data.lastDate)} />
          <StatCard
            emoji="⏰"
            label="Próxima Estimada"
            value={nextEstimated ? formatDate(nextEstimated) : "—"}
            sub="aprox. 30 dias após a última"
          />
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-gray-400">
          <p>Nenhum histórico financeiro encontrado para este cadastro.</p>
          <p className="text-xs mt-2">Contate a administração se houver algum erro.</p>
        </div>
      )}

      {/* Transações recentes */}
      {data && data.transactions.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">📋 Últimas contribuições</h3>
          <div className="space-y-2">
            {data.transactions.slice(0, 5).map((tx, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                <span className="text-sm text-gray-300">{formatDate(tx.date)}</span>
                <span className="text-sm font-medium text-emerald-400">{formatCurrency(tx.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
