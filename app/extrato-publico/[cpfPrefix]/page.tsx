"use client";

import { useConvexQuery } from "@/lib/convex";
import { formatCurrency, formatDate } from "@/lib/utils";
import { use } from "react";

type Transaction = {
  date: string;
  time: string;
  value: number;
  detail: string;
};

type PublicHistoryData = {
  success: boolean;
  error?: string;
  associate?: {
    name: string;
    unit: string | null;
    total: number;
    monthsActive: number;
    lastDate: string | null;
    paidThisMonth: boolean;
    transactions: Transaction[];
  };
} | null;

interface PageProps {
  params: Promise<{ cpfPrefix: string }>;
}

export default function PublicExtratoPage({ params }: PageProps) {
  const { cpfPrefix } = use(params);

  const { data, loading, error } = useConvexQuery<PublicHistoryData>(
    "transactions:getPublicAssociateHistory",
    { cpfPrefix4: cpfPrefix },
    !cpfPrefix
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-300">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold animate-pulse">Carregando extrato público...</p>
        </div>
      </div>
    );
  }

  if (error || (data && !data.success)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-300 p-6">
        <div className="max-w-md w-full bg-slate-900 border border-red-950/40 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <span className="text-4xl">⚠️</span>
          <h2 className="text-lg font-bold text-red-400">Erro ao buscar extrato</h2>
          <p className="text-sm text-slate-450">{error || data?.error}</p>
        </div>
      </div>
    );
  }

  const associate = data?.associate;
  const txs = associate?.transactions ?? [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-4 sm:p-6 md:p-8 flex justify-center">
      <div className="max-w-3xl w-full space-y-6">
        
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Extrato Financeiro Público</h1>
            <p className="text-xs text-slate-400 mt-1">
              Unidade: <strong className="text-slate-200">{associate?.unit ?? "Não informada"}</strong>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Titular: <strong className="text-slate-200">{associate?.name}</strong>
            </p>
          </div>
          <div className="flex gap-4 sm:text-right">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Contribuído</p>
              <p className="text-lg font-extrabold text-emerald-400">{formatCurrency(associate?.total ?? 0)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Meses Ativos</p>
              <p className="text-lg font-extrabold text-white">{associate?.monthsActive ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Tabela de Transações */}
        {txs.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 shadow-lg">
            Nenhum registro de contribuição encontrado para este CPF.
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-xs uppercase font-bold tracking-wider">
                    <th className="text-left p-4">Data</th>
                    <th className="text-left p-4">Hora</th>
                    <th className="text-left p-4">Tipo</th>
                    <th className="text-right p-4">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map((tx, i) => (
                    <tr key={i} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/10 transition">
                      <td className="p-4 text-slate-300 font-medium">{formatDate(tx.date)}</td>
                      <td className="p-4 text-slate-400">{tx.time.slice(0, 5)}</td>
                      <td className="p-4 text-slate-400">{tx.detail}</td>
                      <td className={`p-4 text-right font-bold ${tx.value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {formatCurrency(tx.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Rodapé da página pública */}
        <div className="text-center text-[10px] text-slate-500 mt-8">
          Santorini Residencial © {new Date().getFullYear()} - Informações anonimizadas para conformidade com privacidade.
        </div>
      </div>
    </div>
  );
}
