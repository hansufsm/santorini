/**
 * portal/extrato/page.tsx — Extrato financeiro completo do associado
 * Exibe todas as transações registradas para este associado.
 */
"use client";

import { useAuth } from "@/lib/auth";
import { useConvexQuery } from "@/lib/convex";
import { formatCurrency, formatDate } from "@/lib/utils";

type Transaction = {
  date: string;
  time: string;
  value: number;
  detail: string;
  type: string;
  name: string;
};

type HistoryData = {
  name: string;
  total: number;
  monthsActive: number;
  lastDate: string;
  transactions: Transaction[];
} | null;

export default function ExtratoPage() {
  const { session } = useAuth();

  const canViewFinancialData = session?.role === "associado" && Boolean(session?.associateId);
  const isLinkedResident = Boolean(session?.parentAssociateId) && !session?.associateId;

  const { data, loading, error } = useConvexQuery<HistoryData>(
    "transactions:getAssociateHistory",
    { search: "", associateId: canViewFinancialData ? session?.associateId : undefined, sessionToken: session?.token ?? "" },
    !session || !canViewFinancialData
  );

  if (!session) return null;

  if (!canViewFinancialData) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-white">Extrato Financeiro</h2>
          <p className="text-sm text-emerald-100/60 mt-1">Área financeira protegida</p>
        </div>
        <section className="rounded-2xl border border-emerald-400/15 bg-emerald-950/60 p-6">
          <p className="text-sm font-bold text-white">Acesso restrito ao associado contribuinte</p>
          <p className="mt-2 text-sm leading-relaxed text-emerald-100/65">
            {isLinkedResident
              ? `Seu cadastro está vinculado à unidade ${session.unit || "—"}${session.financialResponsibleName ? `, cujo titular financeiro é ${session.financialResponsibleName}` : ""}. Para preservar a privacidade, o extrato detalhado permanece disponível apenas ao associado titular.`
              : "Para preservar a privacidade, este extrato só é exibido quando a conta tem vínculo de associado contribuinte confirmado."}
          </p>
        </section>
      </div>
    );
  }

  if (loading) return <div className="text-gray-400 text-center py-12">Carregando extrato…</div>;
  if (error) return <div className="text-red-400 text-center py-12">Erro: {error}</div>;

  const txs = data?.transactions ?? [];

  return (
    <div className="space-y-4">

      <div>
        <h2 className="text-xl font-bold text-white">Extrato Financeiro</h2>
        <p className="text-sm text-gray-400 mt-1">
          {txs.length} registro(s) encontrado(s) para {session.name}
        </p>
      </div>

      {/* Resumo */}
      {data && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex gap-6">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total</p>
            <p className="text-lg font-bold text-emerald-400">{formatCurrency(data.total)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Meses</p>
            <p className="text-lg font-bold text-white">{data.monthsActive}</p>
          </div>
        </div>
      )}

      {/* Tabela de transações */}
      {txs.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-gray-400">
          Nenhuma transação encontrada.
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                <th className="text-left p-3">Data</th>
                <th className="text-left p-3">Hora</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-right p-3">Valor</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((tx, i) => (
                <tr key={i} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30">
                  <td className="p-3 text-gray-300">{formatDate(tx.date)}</td>
                  <td className="p-3 text-gray-400">{tx.time.slice(0, 5)}</td>
                  <td className="p-3 text-gray-400">{tx.detail}</td>
                  <td className={`p-3 text-right font-medium ${tx.value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatCurrency(tx.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
