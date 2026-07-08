"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarDays,
  Search,
  Users,
  ArrowLeft,
  CheckCircle,
  Download,
  TrendingDown,
  DollarSign,
  Building,
  CheckCircle2,
  ChevronRight,
  X,
  FileText
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useConvexQuery } from "@/lib/convex";
import { formatCurrency, formatDate, currentMonthKey } from "@/lib/utils";

type Defaulter = {
  associateId: string;
  name: string;
  unit: string;
  monthsOverdue: number;
  totalOverdueValue: number;
  lastPaymentDate: string | null;
  joinedAt: string;
};

type AssocSummary = {
  total: number;
  ativos: number;
  inativos: number;
  inadimplentes: number;
};

type Transaction = {
  date: string;
  value: number;
  detail: string;
};

type AssociateHistory = {
  name: string;
  unit?: string | null;
  total: number;
  monthsActive: number;
  lastDate: string;
  paidThisMonth: boolean;
  transactions: Transaction[];
  monthlyFee: number;
} | null;

function CardShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-3xl border backdrop-blur-sm shadow-2xl shadow-emerald-950/20 ${className}`}
      style={{ backgroundColor: "var(--bg-module)", borderColor: "var(--border-main)" }}
    >
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="py-12 text-center text-sm text-emerald-200/50">{text}</div>;
}

export default function InadimplenciaPage() {
  const { session } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [search, setSearch] = useState("");
  const [selectedAssociateId, setSelectedAssociateId] = useState<string | null>(null);

  // Queries
  const { data: monthsData } = useConvexQuery<string[]>("transactions:getAvailableMonths");
  const { data: assocSummary } = useConvexQuery<AssocSummary>("associates:getAssociatesSummary");
  const { data: defaulters, loading: defaultersLoading } = useConvexQuery<Defaulter[]>(
    "transactions:getDefaulters",
    { sessionToken: session?.token ?? "", monthKey: selectedMonth },
    !session
  );

  // Determinar meses válidos
  const months = useMemo(() => {
    const defaultMonth = currentMonthKey();
    if (!monthsData?.length) return [defaultMonth];
    // Se o mês atual não estiver no array, adiciona-o no início
    const allMonths = [...monthsData];
    if (!allMonths.includes(defaultMonth)) {
      allMonths.unshift(defaultMonth);
    }
    return allMonths;
  }, [monthsData]);

  // Formatação de nome de mês gerencial
  function formatMonthLabel(monthKey: string) {
    const [year, month] = monthKey.split("-").map(Number);
    if (!year || !month) return monthKey;
    return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
  }

  // Filtrar inadimplentes pelo termo de busca local (Nome ou Unidade)
  const filteredDefaulters = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!defaulters) return [];
    if (!term) return defaulters;
    return defaulters.filter(
      (d) =>
        d.name.toLowerCase().includes(term) ||
        d.unit.toLowerCase().includes(term)
    );
  }, [defaulters, search]);

  // Estatísticas e KPIs
  const kpis = useMemo(() => {
    const count = defaulters?.length ?? 0;
    const totalValue = defaulters?.reduce((acc, d) => acc + d.totalOverdueValue, 0) ?? 0;
    const activeCount = assocSummary?.ativos ?? 0;
    const adimplencyRate = activeCount > 0 ? ((activeCount - count) / activeCount) * 100 : 100;
    return { count, totalValue, adimplencyRate };
  }, [defaulters, assocSummary]);

  // Exportar para CSV
  function handleExportCSV() {
    if (!filteredDefaulters.length) return;

    const headers = ["Unidade", "Associado", "Meses em Atraso", "Valor Acumulado (R$)", "Último Pagamento"];
    const rows = filteredDefaulters.map((d) => [
      d.unit,
      d.name,
      d.monthsOverdue,
      d.totalOverdueValue.toFixed(2),
      d.lastPaymentDate ? formatDate(d.lastPaymentDate) : "Nunca pagou",
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(";")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `inadimplencia_${selectedMonth}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (!session) return null;

  return (
    <div className="page-fade space-y-6 pb-8">
      
      {/* Header da Tela */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300/80">Gestão Operacional</p>
          <h1 className="text-3xl font-black text-white mt-1">Relatório de Inadimplência</h1>
          <p className="text-sm text-emerald-200/55 mt-1">
            Acompanhamento retroativo com base no Saldo Acumulado (Expected vs Paid).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-xl border border-emerald-800/60 bg-emerald-950/50 px-3 py-2.5 text-sm text-emerald-50 outline-none transition-colors focus:border-emerald-400"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {formatMonthLabel(m)}
              </option>
            ))}
          </select>
          <button
            onClick={handleExportCSV}
            disabled={!filteredDefaulters.length}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-emerald-950/40 px-4 py-2.5 text-sm font-bold text-emerald-100 transition-colors hover:bg-emerald-900/60 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Cards de Métricas (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative overflow-hidden rounded-3xl p-5 shadow-xl bg-gradient-to-br from-red-950/70 via-red-900/50 to-red-800/30 border border-red-900/40 text-white">
          <div className="absolute right-4 top-4 rounded-full bg-white/10 p-1.5 text-red-300">
            <DollarSign className="h-5 w-5" />
          </div>
          <p className="text-sm text-red-200/80">Total em Atraso (Acumulado)</p>
          <p className="mt-4 text-3xl font-extrabold tracking-tight">
            {defaultersLoading ? "..." : formatCurrency(kpis.totalValue)}
          </p>
          <p className="mt-3 text-xs text-red-200/55 leading-snug">
            Soma do saldo devedor de todas as unidades pendentes.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-3xl p-5 shadow-xl bg-gradient-to-br from-amber-950/70 via-amber-900/50 to-amber-800/30 border border-amber-900/40 text-white">
          <div className="absolute right-4 top-4 rounded-full bg-white/10 p-1.5 text-amber-300">
            <Building className="h-5 w-5" />
          </div>
          <p className="text-sm text-amber-200/80">Unidades Inadimplentes</p>
          <p className="mt-4 text-3xl font-extrabold tracking-tight">
            {defaultersLoading ? "..." : `${kpis.count} Unidade(s)`}
          </p>
          <p className="mt-3 text-xs text-amber-200/55 leading-snug">
            {assocSummary ? `${assocSummary.ativos} associados ativos cadastrados` : "Buscando associados..."}
          </p>
        </div>

        <div className="relative overflow-hidden rounded-3xl p-5 shadow-xl bg-gradient-to-br from-emerald-950/70 via-emerald-900/50 to-emerald-800/30 border border-emerald-900/40 text-white">
          <div className="absolute right-4 top-4 rounded-full bg-white/10 p-1.5 text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="text-sm text-emerald-200/80">Taxa de Adimplência</p>
          <p className="mt-4 text-3xl font-extrabold tracking-tight">
            {defaultersLoading ? "..." : `${kpis.adimplencyRate.toFixed(1)}%`}
          </p>
          <p className="mt-3 text-xs text-emerald-200/55 leading-snug">
            Percentual de associados ativos em dia no mês selecionado.
          </p>
        </div>
      </div>

      {/* Caixa de Pesquisa e Tabela */}
      <CardShell className="overflow-hidden">
        <div className="border-b border-emerald-900/70 p-4 sm:p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Unidades com Pendência em {formatMonthLabel(selectedMonth)}</h3>
            <p className="text-sm text-emerald-200/55">
              Clique em um associado para abrir a auditoria financeira individual.
            </p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-300/60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar por nome ou unidade..."
              className="w-full sm:w-72 rounded-xl border border-emerald-800/60 bg-emerald-950/50 py-2 pl-10 pr-3 text-sm text-white placeholder:text-emerald-200/35 outline-none transition-colors focus:border-emerald-400"
            />
          </div>
        </div>

        {defaultersLoading ? (
          <EmptyState text="Carregando inadimplentes..." />
        ) : filteredDefaulters.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-10 bg-emerald-950/90 text-xs uppercase tracking-widest text-emerald-200/60 backdrop-blur">
                <tr>
                  <th className="px-5 py-4 text-left font-semibold">Unidade</th>
                  <th className="px-5 py-4 text-left font-semibold">Associado</th>
                  <th className="px-5 py-4 text-center font-semibold">Meses em Atraso</th>
                  <th className="px-5 py-4 text-right font-semibold">Valor Acumulado</th>
                  <th className="px-5 py-4 text-right font-semibold">Último Pagamento</th>
                  <th className="px-5 py-4 text-center font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filteredDefaulters.map((d, index) => {
                  const isReincidente = d.monthsOverdue >= 2;
                  return (
                    <tr
                      key={d.associateId}
                      className="border-t border-emerald-900/60 transition-colors odd:bg-emerald-950/10 hover:bg-emerald-900/20 cursor-pointer"
                      onClick={() => setSelectedAssociateId(d.associateId)}
                    >
                      {/* Unidade */}
                      <td className="border-t border-emerald-900/45 px-5 py-4 font-bold text-white">
                        {d.unit}
                      </td>
                      {/* Associado */}
                      <td className="border-t border-emerald-900/45 px-5 py-4 font-semibold text-emerald-100">
                        {d.name}
                      </td>
                      {/* Meses em Atraso */}
                      <td className="border-t border-emerald-900/45 px-5 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                            isReincidente
                              ? "bg-red-950/50 text-red-400 border border-red-900/50"
                              : "bg-amber-950/50 text-amber-400 border border-amber-900/50"
                          }`}
                        >
                          {isReincidente && <AlertCircle className="h-3.5 w-3.5" />}
                          {d.monthsOverdue} {d.monthsOverdue === 1 ? "mês" : "meses"}
                          {isReincidente && " (Reincidente)"}
                        </span>
                      </td>
                      {/* Valor Acumulado */}
                      <td className="border-t border-emerald-900/45 px-5 py-4 text-right font-black text-red-300">
                        {formatCurrency(d.totalOverdueValue)}
                      </td>
                      {/* Último Pagamento */}
                      <td className="border-t border-emerald-900/45 px-5 py-4 text-right text-emerald-200/70">
                        {d.lastPaymentDate ? formatDate(d.lastPaymentDate) : "Nunca pagou"}
                      </td>
                      {/* Ações */}
                      <td className="border-t border-emerald-900/45 px-5 py-4 text-center">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          Auditar
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState text="Nenhuma unidade inadimplente localizada para os critérios de busca." />
        )}
      </CardShell>

      {/* Drawer Lateral de Detalhes Financeiros */}
      {selectedAssociateId && (
        <DrawerAuditoria
          associateId={selectedAssociateId}
          selectedMonth={selectedMonth}
          sessionToken={session.token}
          onClose={() => setSelectedAssociateId(null)}
        />
      )}
    </div>
  );
}

// ─── COMPONENTE DRAWER DE AUDITORIA FINANCEIRA ─────────────────────────────────

function DrawerAuditoria({
  associateId,
  selectedMonth,
  sessionToken,
  onClose,
}: {
  associateId: string;
  selectedMonth: string;
  sessionToken: string;
  onClose: () => void;
}) {
  const { data: history, loading } = useConvexQuery<AssociateHistory>(
    "transactions:getAssociateHistory",
    { search: "", associateId, sessionToken }
  );

  const MONTHLY_FEE = history?.monthlyFee ?? 50;

  // Lógica de cálculo cumulativo mês a mês para renderizar o histórico
  const statement = useMemo(() => {
    if (!history) return [];

    let startMonthKey = history.transactions.length > 0
      ? [...history.transactions].sort((a, b) => a.date.localeCompare(b.date))[0].date.slice(0, 7)
      : null;

    if (!startMonthKey) {
      startMonthKey = selectedMonth;
    }

    // Regra: Considerar cobranças apenas a partir de Março de 2026 ("2026-03")
    if (startMonthKey.localeCompare("2026-03") < 0) {
      startMonthKey = "2026-03";
    }

    // Gerar meses de startMonthKey até selectedMonth
    const [startYear, startMonth] = startMonthKey.split("-").map(Number);
    const [endYear, endMonth] = selectedMonth.split("-").map(Number);

    const statementMonths: string[] = [];
    let curYear = startYear;
    let curMonth = startMonth;

    while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
      statementMonths.push(`${curYear}-${String(curMonth).padStart(2, "0")}`);
      curMonth++;
      if (curMonth > 12) {
        curMonth = 1;
        curYear++;
      }
    }

    // Inverter para mostrar os mais recentes primeiro
    statementMonths.reverse();

    // Map das transações por mês de execução (para mostrar o que foi pago NO mês)
    const monthTxMap = new Map<string, Transaction[]>();
    for (const tx of history.transactions) {
      const key = tx.date.slice(0, 7);
      const list = monthTxMap.get(key) ?? [];
      list.push(tx);
      monthTxMap.set(key, list);
    }

    const rows = [];
    const totalTxs = history.transactions;

    // Calcular valores de trás para frente ou acumulado
    // Como a lista está do mais recente ao mais antigo, calcularemos as variáveis acumuladas mês a mês
    for (let i = 0; i < statementMonths.length; i++) {
      const monthKey = statementMonths[i];
      const indexFromStart = statementMonths.length - 1 - i;
      
      const expectedCumulative = (indexFromStart + 1) * MONTHLY_FEE;
      
      // Filtra transações ocorridas até o fim desse mês específico
      const [y, m] = monthKey.split("-").map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      const limitDate = `${monthKey}-${String(lastDay).padStart(2, "0")}`;

      const paidCumulative = totalTxs
        .filter((tx) => tx.date.localeCompare(limitDate) <= 0)
        .reduce((acc, tx) => acc + tx.value, 0);

      const balance = paidCumulative - expectedCumulative;
      const paidInMonth = monthTxMap.get(monthKey) ?? [];
      const totalPaidInMonth = paidInMonth.reduce((acc, t) => acc + t.value, 0);

      rows.push({
        monthKey,
        expectedThisMonth: MONTHLY_FEE,
        paidThisMonth: totalPaidInMonth,
        transactions: paidInMonth,
        cumulativeExpected: expectedCumulative,
        cumulativePaid: paidCumulative,
        balance,
        status: balance >= 0 ? "Em Dia" : "Pendente",
      });
    }

    return rows;
  }, [history, selectedMonth]);

  function formatMonthNameShort(monthKey: string) {
    const [year, month] = monthKey.split("-").map(Number);
    return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(new Date(year, month - 1, 1));
  }

  return (
    <>
      {/* Backdrop escuro */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Painel lateral (Drawer) */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-emerald-950/95 border-l border-emerald-800/40 p-6 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header do Drawer */}
        <div className="flex items-start justify-between border-b border-emerald-900/60 pb-4 mb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">Auditoria Individual</span>
            <h3 className="text-xl font-bold text-white mt-1">
              {loading ? "Buscando associado..." : history?.name}
            </h3>
            <p className="text-xs text-emerald-200/50 mt-1">
              {loading ? "Unidade..." : `Unidade: ${history?.unit ?? "Não vinculada"}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-emerald-900/40 p-2 text-emerald-300 hover:bg-emerald-900/80 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Conteúdo do Drawer */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-2">
          {loading ? (
            <div className="py-12 text-center text-emerald-100/50 text-sm">
              Carregando histórico de pagamentos...
            </div>
          ) : history ? (
            <>
              {/* Card Resumo do Associado */}
              <div className="rounded-2xl bg-emerald-950/65 border border-emerald-800/45 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs text-emerald-200/60">
                  <div>
                    <span className="block text-emerald-200/40">Total Pago Acumulado</span>
                    <span className="block text-base font-bold text-white mt-1">
                      {formatCurrency(history.total)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-emerald-200/40">Último Pagamento</span>
                    <span className="block text-base font-bold text-white mt-1">
                      {history.lastDate ? formatDate(history.lastDate) : "Nenhum histórico"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabela do Histórico Cumulativo */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-300 mb-3">
                  Fluxo Cumulativo Mês a Mês
                </h4>
                <div className="space-y-3">
                  {statement.map((row) => {
                    const isOk = row.balance >= 0;
                    return (
                      <div
                        key={row.monthKey}
                        className={`rounded-xl border p-3 transition-colors ${
                          isOk
                            ? "bg-emerald-950/20 border-emerald-900/40"
                            : "bg-red-950/20 border-red-900/40"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm text-white capitalize">
                            {formatMonthNameShort(row.monthKey)}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isOk ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"
                            }`}
                          >
                            {isOk ? "Em Dia" : "Pendente"}
                          </span>
                        </div>

                        {/* Detalhes de Valores */}
                        <div className="grid grid-cols-3 gap-2 mt-3 text-[11px] text-emerald-200/50">
                          <div>
                            <span className="block">Pago no Mês</span>
                            <span className="block font-semibold text-emerald-50 mt-0.5">
                              {formatCurrency(row.paidThisMonth)}
                            </span>
                          </div>
                          <div>
                            <span className="block">Pago Acumulado</span>
                            <span className="block font-semibold text-emerald-50 mt-0.5">
                              {formatCurrency(row.cumulativePaid)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="block">Saldo do Mês</span>
                            <span
                              className={`block font-extrabold mt-0.5 ${
                                isOk ? "text-emerald-300" : "text-red-300"
                              }`}
                            >
                              {row.balance > 0 ? "+" : ""}
                              {formatCurrency(row.balance)}
                            </span>
                          </div>
                        </div>

                        {/* Transações Efetivas no Mês */}
                        {row.transactions.length > 0 && (
                          <div className="border-t border-emerald-900/30 pt-2 mt-2 space-y-1">
                            <span className="block text-[9px] uppercase tracking-wide text-emerald-200/35">
                              Registros de Pagamento
                            </span>
                            {row.transactions.map((tx, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between items-center text-[10px] bg-emerald-900/15 rounded px-2 py-1"
                              >
                                <span className="text-emerald-200/60 truncate max-w-[13rem]">
                                  {tx.detail} ({formatDate(tx.date)})
                                </span>
                                <span className="font-bold text-emerald-100">
                                  {formatCurrency(tx.value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <EmptyState text="Não foi possível recuperar os dados de auditoria deste associado." />
          )}
        </div>
      </div>
    </>
  );
}
