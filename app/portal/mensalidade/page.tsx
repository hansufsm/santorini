/**
 * portal/mensalidade/page.tsx — Status da mensalidade
 * Mostra se o associado está em dia e histórico dos últimos 12 meses.
 */
"use client";

import { useAuth } from "@/lib/auth";
import { useConvexQuery } from "@/lib/convex";
import { formatCurrency, formatDate, currentMonthKey } from "@/lib/utils";

type Transaction = { date: string; value: number; detail: string };
type HistoryData = { total: number; monthsActive: number; lastDate: string; transactions: Transaction[] } | null;

// Nomes dos meses em português
const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1]}/${y}`;
}

export default function MensalidadePage() {
  const { session } = useAuth();

  const { data, loading, error } = useConvexQuery<HistoryData>(
    "transactions:getAssociateHistory",
    { search: session?.name ?? "" },
    !session
  );

  if (!session) return null;
  if (loading) return <div className="text-gray-400 text-center py-12">Carregando…</div>;
  if (error) return <div className="text-red-400 text-center py-12">Erro: {error}</div>;

  const thisMonth = currentMonthKey();
  const txs = data?.transactions ?? [];

  // Montar mapa de meses → valor pago
  const monthMap: Record<string, number> = {};
  for (const tx of txs) {
    const key = tx.date.slice(0, 7);
    if (!monthMap[key]) monthMap[key] = 0;
    monthMap[key] += tx.value;
  }

  // Pegar últimos 12 meses (do mais antigo ao mais recente)
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const paidThisMonth = !!monthMap[thisMonth];
  const lastTx = txs[0]; // já vem ordenado do mais recente

  return (
    <div className="space-y-6">

      <div>
        <h2 className="text-xl font-bold text-white">Mensalidade</h2>
        <p className="text-sm text-gray-400 mt-1">Situação da sua contribuição mensal</p>
      </div>

      {/* Status do mês atual */}
      <div className={`rounded-xl p-5 border ${paidThisMonth ? "bg-emerald-900/30 border-emerald-600" : "bg-yellow-900/30 border-yellow-600"}`}>
        <p className="text-2xl font-bold text-white">
          {paidThisMonth ? "✅ Em dia" : "⚠️ Pendente"}
        </p>
        <p className="text-sm text-gray-300 mt-2">
          {paidThisMonth
            ? `Contribuição de ${monthLabel(thisMonth)}: ${formatCurrency(monthMap[thisMonth])}`
            : `Não identificamos contribuição para ${monthLabel(thisMonth)}.`}
        </p>
        {lastTx && !paidThisMonth && (
          <p className="text-xs text-gray-400 mt-1">
            Última contribuição: {formatDate(lastTx.date)} — {formatCurrency(lastTx.value)}
          </p>
        )}
      </div>

      {/* Histórico dos últimos 12 meses */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-4">📅 Histórico — Últimos 12 meses</h3>
        <div className="space-y-2">
          {months.map((key) => {
            const paid = !!monthMap[key];
            const value = monthMap[key];
            const isCurrent = key === thisMonth;
            return (
              <div key={key} className={`flex justify-between items-center px-3 py-2 rounded-lg ${isCurrent ? "bg-gray-800" : ""}`}>
                <span className="text-sm text-gray-300">
                  {isCurrent && <span className="text-xs text-emerald-400 mr-2">▶</span>}
                  {monthLabel(key)}
                </span>
                <span className={`text-sm font-medium ${paid ? "text-emerald-400" : "text-gray-600"}`}>
                  {paid ? formatCurrency(value) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
