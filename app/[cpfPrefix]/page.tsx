"use client";

import { useConvexQuery, convexMutation } from "@/lib/convex";
import { formatCurrency, formatDate } from "@/lib/utils";
import { use, useEffect, useRef } from "react";
import { notFound } from "next/navigation";
import { useAuth } from "@/lib/auth";

function maskName(name: string): string {
  if (!name) return "";
  return name
    .split(" ")
    .map((word) => {
      if (word.length <= 2) return word; // Keep small words like "de", "da", "do"
      const keepLen = Math.min(3, Math.ceil(word.length / 2));
      return word.slice(0, keepLen) + "*".repeat(Math.max(3, word.length - keepLen));
    })
    .join(" ");
}

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
    yearlyTotals: Record<string, number>;
    transactions: Transaction[];
  };
} | null;

interface PageProps {
  params: Promise<{ cpfPrefix: string }>;
}

export default function PublicExtratoPage({ params }: PageProps) {
  const { cpfPrefix } = use(params);
  const { session } = useAuth();
  const alertSent = useRef(false);

  const cleanCode = cpfPrefix.replace(/\D/g, "");

  // Valida se o parâmetro contém apenas dígitos, pontos ou traços, e possui pelo menos 5 dígitos numéricos
  if (!/^[0-9.-]+$/.test(cpfPrefix) || cleanCode.length < 5) {
    notFound();
  }

  const { data, loading, error } = useConvexQuery<PublicHistoryData>(
    "transactions:getPublicAssociateHistory",
    { publicCode: cleanCode },
    !cleanCode
  );

  // Alerta no Telegram sempre que a rota pública for acessada (sucesso ou falha)
  useEffect(() => {
    if ((data || error) && !alertSent.current) {
      alertSent.current = true;
      
      let name = "Erro ao carregar";
      let unit = "";
      
      if (data) {
        if (data.success && data.associate) {
          name = data.associate.name;
          unit = data.associate.unit || "Sem unidade";
        } else {
          name = data.error || "Código não cadastrado";
        }
      } else if (error) {
        name = `Erro de conexão: ${error}`;
      }
      
      const viewerUserId = session?._id || "";
      const viewerName = session?.name || "";

      // Detectar robô/crawler
      let isBot = false;
      let userAgent = "";
      if (typeof window !== "undefined" && typeof navigator !== "undefined") {
        userAgent = navigator.userAgent || "";
        const botPattern = /bot|google|baidu|bing|msn|duckduckbot|teoma|slurp|yandex|crawler|spider|robot|crawling|lighthouse/i;
        isBot = botPattern.test(userAgent) || !!navigator.webdriver;
      }

      convexMutation("telegram:logStatementAccess", {
        associateName: name,
        unit: unit || "Sem Unidade",
        url: typeof window !== "undefined" ? window.location.href : "",
        type: "Público",
        viewerUserId: viewerUserId || undefined,
        viewerName: viewerName || undefined,
        isBot,
        userAgent: userAgent || undefined,
      }).catch((err) => console.error("Falha ao registrar acesso público:", err));
    }
  }, [data, error, cpfPrefix, session]);

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
          <p className="text-sm text-slate-400">{error || data?.error}</p>
        </div>
      </div>
    );
  }

  const associate = data?.associate;
  const txs = associate?.transactions ?? [];
  const yearlyTotals = associate?.yearlyTotals ?? {};
  
  // Agrupar transações por ano
  const transactionsByYear: Record<string, Transaction[]> = {};
  for (const tx of txs) {
    const year = tx.date.slice(0, 4);
    if (!transactionsByYear[year]) {
      transactionsByYear[year] = [];
    }
    transactionsByYear[year].push(tx);
  }
  
  const years = Object.keys(yearlyTotals).sort((a, b) => b.localeCompare(a));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-4 sm:p-6 md:p-8 flex justify-center">
      <div className="max-w-3xl w-full space-y-6">
        
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>📊</span> Extrato Financeiro Público (Anual)
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Unidade: <strong className="text-slate-200">{associate?.unit ?? "Não informada"}</strong>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Titular: <strong className="text-slate-200">{maskName(associate?.name ?? "")}</strong>
            </p>
          </div>
          <div className="flex gap-4 sm:text-right">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Acumulado</p>
              <p className="text-lg font-extrabold text-emerald-400">{formatCurrency(associate?.total ?? 0)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Meses Ativos</p>
              <p className="text-lg font-extrabold text-white">{associate?.monthsActive ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Resumo Anual */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider pl-1">Acumulado por Ano</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {years.map((year) => (
              <div key={year} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col justify-between">
                <p className="text-xs text-slate-500 font-bold uppercase">Exercício {year}</p>
                <p className="text-base font-extrabold text-emerald-400 mt-2">{formatCurrency(yearlyTotals[year])}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Histórico por Ano */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider pl-1">Histórico de Lançamentos</h2>
          
          {years.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 shadow-lg">
              Nenhum registro de contribuição encontrado para este código.
            </div>
          ) : (
            years.map((year) => {
              const yearTxs = transactionsByYear[year] ?? [];
              return (
                <div key={year} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg space-y-2">
                  <div className="bg-slate-950/60 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-200">Ano Fiscal {year}</h3>
                    <span className="text-xs font-semibold text-emerald-400">Total: {formatCurrency(yearlyTotals[year])}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                          <th className="text-left p-4">Data da Contribuição</th>
                          <th className="text-left p-4">Hora</th>
                          <th className="text-left p-4">Tipo</th>
                          <th className="text-right p-4">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {yearTxs.map((tx, i) => (
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
              );
            })
          )}
        </div>

        {/* Banner de Pagamento Amigável (Caso inadimplente/pendente) */}
        {associate && !associate.paidThisMonth && (
          <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-5 md:p-6 space-y-3 shadow-lg animate-fade-in">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0" role="img" aria-label="Aperto de mão amigável">🤝</span>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-200">Sua contribuição fortalece nossa comunidade!</h4>
                <p className="text-xs text-amber-200/70 leading-relaxed">
                  Identificamos que há pendências no acumulado desta unidade para o exercício de 2026. Regularize sua situação realizando uma transferência PIX para a chave oficial da associação:
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2 pt-1">
                  <span
                    onClick={() => {
                      if (typeof navigator !== "undefined") {
                        navigator.clipboard.writeText("pix@santorini.org.br");
                        alert("Chave PIX copiada!");
                      }
                    }}
                    className="bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs px-2.5 py-1.5 rounded-lg select-all cursor-pointer hover:bg-amber-500/20 transition-colors"
                    title="Clique para copiar"
                  >
                    pix@santorini.org.br
                  </span>
                  <span className="text-[10px] text-amber-500/60 font-semibold">Chave PIX Oficial (E-mail)</span>
                </div>
              </div>
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
