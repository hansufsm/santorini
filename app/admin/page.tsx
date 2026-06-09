"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  Info,
  FileText,
  Search,
  Users,
  Wrench,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
} from "recharts";
import { useAuth } from "@/lib/auth";
import { useConvexQuery } from "@/lib/convex";
import { formatCurrency, formatDate, currentMonthKey } from "@/lib/utils";

type TxSummary = {
  totalReceived: number;
  totalSent: number;
  netBalance: number;
  contributorsCount: number;
  receivedCount: number;
  sentCount: number;
  totalTransactions: number;
};

type AssocSummary = {
  total: number;
  ativos: number;
  inativos: number;
  inadimplentes: number;
};

type Transaction = {
  _id?: string;
  date: string;
  time?: string;
  type: string;
  name: string;
  detail: string;
  value: number;
  originalValue?: string;
  transactionKey?: string;
};

type AssociateHistory = {
  name: string;
  unit?: string | null;
  total: number;
  monthsActive: number;
  lastDate: string;
  paidThisMonth: boolean;
  transactions: Transaction[];
} | null;

type MonthlyFlow = {
  month: string;
  received: number;
  sent: number;
};

type TopContributor = {
  name: string;
  total: number;
};

type Reservation = { status: string; deletedAt?: number };
type Maintenance = { status: string; deletedAt?: number };
type Associate = { _id: string; name: string; payerNames?: string[] };

const EXPENSE_COLORS = ["#f59e0b", "#ef4444", "#3b82f6", "#14b8a6", "#a855f7", "#84cc16"];
const PAYMENT_LINK = "https://loja.infinitepay.io/amrts/mlr1645-mensalidade-amtrs";
const PIX_KEY = "pix@santorini.org.br";

function monthLabel(monthKey: string) {
  if (monthKey === "all") return "Todos os meses";
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function shortMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(new Date(year, month - 1, 1));
}

function normalizeType(value?: string) {
  if (!value?.trim()) return "Outros / Tarifas";
  return value.trim();
}

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

function DesktopRecommendedNotice({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-sky-300/25 bg-sky-950/30 px-4 py-3 text-sm text-sky-100/80 ${className}`}>
      <div className="flex gap-3">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-300" />
        <p className="leading-relaxed">
          <strong className="text-sky-100">Melhor em Desktop/Laptop PC:</strong> esta visualização possui muitos dados simultâneos. No celular, mostramos uma versão resumida e otimizada para leitura rápida.
        </p>
      </div>
    </div>
  );
}

function TransactionMobileCard({ tx }: { tx: Transaction }) {
  const isIncome = tx.value >= 0;
  return (
    <article className="rounded-2xl border border-emerald-900/60 bg-emerald-950/30 p-4 shadow-lg shadow-emerald-950/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/65">{formatDate(tx.date)}</p>
          <p className="mt-1 text-base font-bold text-white line-clamp-2">{tx.name || "Sem nome"}</p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-black ${isIncome ? "text-emerald-300" : "text-red-300"}`}>{formatCurrency(tx.value)}</p>
          <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${isIncome ? "bg-emerald-400/10 text-emerald-200" : "bg-red-400/10 text-red-200"}`}>
            {isIncome ? "Entrada" : "Saída"}
          </span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-emerald-950/45 px-3 py-2">
          <p className="text-emerald-200/45">Hora</p>
          <p className="mt-1 font-semibold text-emerald-50">{tx.time?.slice(0, 5) || "—"}</p>
        </div>
        <div className="rounded-xl bg-emerald-950/45 px-3 py-2">
          <p className="text-emerald-200/45">Tipo</p>
          <p className="mt-1 truncate font-semibold text-emerald-50">{tx.type || "—"}</p>
        </div>
      </div>
      <p className="mt-3 rounded-xl bg-emerald-950/35 px-3 py-2 text-sm leading-relaxed text-emerald-50/65">
        {tx.detail || "Sem detalhe informado."}
      </p>
    </article>
  );
}

function MetricCard({
  label,
  value,
  sub,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "emerald" | "red" | "deep" | "outline";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const classes = {
    emerald: "bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-400 text-white",
    red: "bg-gradient-to-br from-red-900 via-red-700 to-red-500 text-white",
    deep: "bg-gradient-to-br from-[#053f32] via-[#047857] to-[#10b981] text-white",
    outline: "text-white border border-emerald-800/60",
  }[tone];

  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-4 sm:p-5 min-h-32 shadow-xl ${classes}`}
      style={tone === "outline" ? { backgroundColor: "var(--bg-card)" } : undefined}
    >
      <div className="absolute right-4 top-4 rounded-full bg-white/10 p-1.5 text-white/70">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-sm text-white/75 pr-10">{label}</p>
      <p className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight">{value}</p>
      <p className="mt-3 text-sm text-white/55 leading-snug">{sub}</p>
    </div>
  );
}

function PaymentVerificationCard({ session }: { session: { associateId?: string; token: string; name: string; role: string } }) {
  const hasAssociateLink = Boolean(session.associateId);
  const { data, loading } = useConvexQuery<AssociateHistory>(
    "transactions:getAssociateHistory",
    { search: "", associateId: session.associateId, sessionToken: session.token },
    !hasAssociateLink
  );
  const monthKey = currentMonthKey();
  const label = monthLabel(monthKey);
  const paidThisMonth = Boolean(data?.paidThisMonth ?? data?.transactions?.some((tx) => tx.date.startsWith(monthKey)));

  if (!hasAssociateLink) {
    return (
      <CardShell className="p-5 sm:p-6 border-amber-300/25 bg-amber-950/20">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200/80">Verificação de pagamento</p>
        <h1 className="mt-3 text-2xl sm:text-3xl font-black text-white">Vínculo de associado não localizado</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-emerald-50/70">
          O dashboard sempre começa pela situação da contribuição mensal. Esta conta de {session.role} não possui vínculo financeiro próprio no cadastro, portanto a conferência individual não pode ser exibida aqui.
        </p>
      </CardShell>
    );
  }

  if (loading) {
    return (
      <CardShell className="p-5 sm:p-6">
        <p className="text-sm text-emerald-100/65">Carregando verificação de pagamento…</p>
      </CardShell>
    );
  }

  return (
    <CardShell className={`relative overflow-hidden p-5 sm:p-6 ${paidThisMonth ? "border-emerald-300/25" : "border-amber-300/30"}`}>
      <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300/80">Verificação de pagamento</p>
          <h1 className="mt-3 text-2xl sm:text-3xl font-black text-white">
            {paidThisMonth ? "Contribuição mensal em dia" : "Contribuição mensal pendente ou não localizada"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-emerald-50/70">
            Status de {label} para {data?.name ?? session.name}. Esta conferência aparece primeiro para manter a regularidade financeira visível antes das ações administrativas.
          </p>
        </div>
        {!paidThisMonth && (
          <div className="w-full lg:max-w-md">
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-950/55 p-4 shadow-xl">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-shrink-0 bg-white p-2 rounded-lg">
                  <img
                    src="/pix-qrcode.png"
                    alt="QR Code Pix"
                    className="w-24 h-24 object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300/80">Pix direto</p>
                  <p className="mt-2 break-all font-mono text-xs font-bold text-white">{PIX_KEY}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </CardShell>
  );
}

export default function AdminPage() {
  const { session } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const { data: txSummary } = useConvexQuery<TxSummary>("transactions:getSummary");
  const { data: assocSummary } = useConvexQuery<AssocSummary>("associates:getAssociatesSummary");
  const { data: reservas } = useConvexQuery<Reservation[]>("reservations:getAllReservations");
  const { data: chamados } = useConvexQuery<Maintenance[]>("maintenances:getAllMaintenances");
  const { data: txList, loading: txLoading } = useConvexQuery<Transaction[]>("transactions:getAllTransactions");
  const { data: monthlyFlow } = useConvexQuery<MonthlyFlow[]>("transactions:getMonthlyFlow", { months: 12 });
  const { data: topContributors } = useConvexQuery<TopContributor[]>("transactions:getTopContributors", { limit: 6 });
  // Carrega associados com seus apelidos de pagamento para a busca expandida
  const { data: associates } = useConvexQuery<Associate[]>("associates:getAllAssociates");

  const pendingReservations = reservas?.filter((r) => r.status === "pendente").length ?? 0;
  const openMaintenances = chamados?.filter((m) => m.status === "aberto").length ?? 0;

  const months = useMemo(() => {
    const source = txList ?? [];
    return Array.from(new Set(source.map((tx) => tx.date?.slice(0, 7)).filter(Boolean))).sort().reverse();
  }, [txList]);

  // Expande a busca para incluir transações de apelidos do mesmo associado.
  // Ex: buscar "Amilton" também retorna transações de "MACPELA EMP IMOBILIARIOS LTDA".
  const expandedNames = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term || !associates?.length) return new Set<string>();
    const names = new Set<string>();
    for (const assoc of associates) {
      const allNames = [assoc.name, ...(assoc.payerNames ?? [])];
      if (allNames.some((n) => n.toLowerCase().includes(term))) {
        for (const n of allNames) names.add(n.toLowerCase());
      }
    }
    return names;
  }, [associates, search]);

  const filteredTransactions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (txList ?? [])
      .filter((tx) => selectedMonth === "all" || tx.date?.startsWith(selectedMonth))
      .filter((tx) => {
        if (!term) return true;
        // Se o nome bate com algum apelido do associado, inclui todas as transações do grupo
        if (expandedNames.size > 0 && expandedNames.has((tx.name ?? "").toLowerCase())) return true;
        return Object.values(tx).some((value) => String(value ?? "").toLowerCase().includes(term));
      })
      .sort((a, b) => b.date.localeCompare(a.date) || String(b.time ?? "").localeCompare(String(a.time ?? "")));
  }, [txList, selectedMonth, search, expandedNames]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const filteredTotals = useMemo(() => {
    const received = filteredTransactions.filter((tx) => tx.value > 0).reduce((acc, tx) => acc + tx.value, 0);
    const sent = Math.abs(filteredTransactions.filter((tx) => tx.value < 0).reduce((acc, tx) => acc + tx.value, 0));
    return { received, sent, balance: received - sent, count: filteredTransactions.length };
  }, [filteredTransactions]);

  const pageTotals = useMemo(() => {
    const received = paginatedTransactions.filter((tx) => tx.value > 0).reduce((acc, tx) => acc + tx.value, 0);
    const sent = Math.abs(paginatedTransactions.filter((tx) => tx.value < 0).reduce((acc, tx) => acc + tx.value, 0));
    return { received, sent, balance: received - sent };
  }, [paginatedTransactions]);

  const selectedMonthFlow = useMemo(() => {
    const groups = new Map<string, { day: string; received: number; sent: number }>();
    for (const tx of filteredTransactions) {
      const day = selectedMonth === "all" ? tx.date.slice(0, 7) : tx.date;
      const current = groups.get(day) ?? { day, received: 0, sent: 0 };
      if (tx.value >= 0) current.received += tx.value;
      else current.sent += Math.abs(tx.value);
      groups.set(day, current);
    }
    return Array.from(groups.values())
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-18)
      .map((item) => ({ ...item, label: selectedMonth === "all" ? shortMonthLabel(item.day) : item.day.slice(8, 10) }));
  }, [filteredTransactions, selectedMonth]);

  const expenseDistribution = useMemo(() => {
    const totals = new Map<string, number>();
    for (const tx of filteredTransactions) {
      if (tx.value >= 0) continue;
      const key = normalizeType(tx.type || tx.detail);
      totals.set(key, (totals.get(key) ?? 0) + Math.abs(tx.value));
    }
    const sorted = Array.from(totals, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    if (sorted.length <= 5) return sorted;
    const head = sorted.slice(0, 4);
    const other = sorted.slice(4).reduce((acc, item) => acc + item.value, 0);
    return [...head, { name: "Outros / Tarifas", value: other }];
  }, [filteredTransactions]);

  const chartFlow = useMemo(() => {
    let accumulated = 0;
    return (monthlyFlow ?? []).map((item) => {
      accumulated += item.received - item.sent;
      return {
        ...item,
        label: shortMonthLabel(item.month),
        balance: accumulated,
      };
    });
  }, [monthlyFlow]);

  if (!session) return null;

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleMonth(value: string) {
    setSelectedMonth(value);
    setPage(1);
  }

  return (
    <div className="page-fade space-y-6 pb-8">
      <PaymentVerificationCard session={session} />

      <CardShell className="overflow-hidden">
        <div className="border-b border-emerald-900/70 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300/80">Diretoria</p>
              <h2 className="mt-2 text-2xl font-black text-white">Gerenciador do histórico de transações</h2>
              <p className="mt-1 text-sm text-emerald-200/55">
                Gráficos, subtotais, busca em qualquer campo, seleção mensal e tabela paginada para análise financeira.
              </p>
              <DesktopRecommendedNotice className="mt-4 lg:hidden" />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-300/60" />
                <input
                  value={search}
                  onChange={(event) => handleSearch(event.target.value)}
                  placeholder="Buscar em qualquer campo..."
                  className="w-full sm:w-72 rounded-xl border border-emerald-800/60 bg-emerald-950/50 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-emerald-200/35 outline-none transition-colors focus:border-emerald-400"
                />
              </div>
              <select
                value={selectedMonth}
                onChange={(event) => handleMonth(event.target.value)}
                className="rounded-xl border border-emerald-800/60 bg-emerald-950/50 px-3 py-2.5 text-sm text-emerald-50 outline-none transition-colors focus:border-emerald-400"
              >
                <option value="all">Todos os meses</option>
                {months.map((month) => (
                  <option key={month} value={month}>{monthLabel(month)}</option>
                ))}
              </select>
              <Link href="/admin/transacoes" className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500">
                Importar CSV
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 p-4 sm:p-5">
          <MetricCard icon={ArrowUpRight} label="Subtotal recebido" value={formatCurrency(filteredTotals.received)} sub={`${filteredTotals.count} registro(s) no filtro`} tone="emerald" />
          <MetricCard icon={ArrowDownRight} label="Subtotal de saída" value={formatCurrency(filteredTotals.sent)} sub="Despesas no recorte atual" tone="red" />
          <MetricCard icon={Banknote} label="Saldo do filtro" value={formatCurrency(filteredTotals.balance)} sub={`Recorte: ${monthLabel(selectedMonth)}`} tone="deep" />
          <MetricCard icon={FileText} label="Subtotal da página" value={formatCurrency(pageTotals.balance)} sub={`${paginatedTransactions.length} item(ns) visíveis`} tone="outline" />
        </div>

        <div className="grid grid-cols-1 2xl:grid-cols-[1.35fr_0.9fr] gap-6 px-4 pb-5 sm:px-5">
          <div className="rounded-3xl border border-emerald-900/60 bg-emerald-950/25 p-4">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-white">Fluxo do recorte selecionado</h3>
              <p className="text-sm text-emerald-200/55">Entradas e saídas agrupadas por mês ou por dia do mês escolhido.</p>
              <DesktopRecommendedNotice className="mt-3 md:hidden" />
            </div>
            <div className="h-72 sm:h-80">
              {selectedMonthFlow.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={selectedMonthFlow} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#115e59" strokeOpacity={0.22} vertical={false} />
                    <XAxis dataKey="label" stroke="#6ee7b7" tick={{ fill: "#a7f3d0", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6ee7b7" tick={{ fill: "#a7f3d0", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                    <Tooltip contentStyle={{ background: "#022c22", border: "1px solid #047857", borderRadius: 16, color: "#ecfdf5" }} formatter={(value: unknown, name: unknown) => [formatCurrency(Number(value)), name === "received" ? "Entradas" : "Saídas"]} />
                    <Legend wrapperStyle={{ color: "#a7f3d0", fontSize: 12 }} />
                    <Bar dataKey="received" name="Entradas" fill="#10b981" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="sent" name="Saídas" fill="#ef4444" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState text="Sem dados para o recorte selecionado." />
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-900/60 bg-emerald-950/25 p-4">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-white">Distribuição de despesas</h3>
              <p className="text-sm text-emerald-200/55">Categorias com maior impacto no caixa filtrado.</p>
              <DesktopRecommendedNotice className="mt-3 md:hidden" />
            </div>
            <div className="h-72 sm:h-80">
              {expenseDistribution.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="55%" outerRadius="82%" paddingAngle={2}>
                      {expenseDistribution.map((_, index) => (
                        <Cell key={index} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#022c22", border: "1px solid #047857", borderRadius: 16, color: "#ecfdf5" }} formatter={(value: unknown) => formatCurrency(Number(value))} />
                    <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ color: "#a7f3d0", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState text="Nenhuma despesa encontrada para os filtros atuais." />
              )}
            </div>
          </div>
        </div>

        {txLoading ? (
          <EmptyState text="Carregando transações…" />
        ) : filteredTransactions.length ? (
          <>
            <div className="hidden overflow-x-auto border-t border-emerald-900/70 md:block">
              <table className="w-full min-w-[920px] border-separate border-spacing-0 text-sm">
                <thead className="sticky top-0 z-10 bg-emerald-950/90 text-xs uppercase tracking-widest text-emerald-200/60 backdrop-blur">
                  <tr>
                    <th className="px-4 py-4 text-left font-semibold">Data</th>
                    <th className="px-4 py-4 text-left font-semibold">Hora</th>
                    <th className="px-4 py-4 text-left font-semibold">Nome</th>
                    <th className="px-4 py-4 text-left font-semibold">Tipo</th>
                    <th className="px-4 py-4 text-left font-semibold">Detalhe</th>
                    <th className="px-4 py-4 text-right font-semibold">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.map((tx, index) => (
                    <tr key={tx._id ?? `${tx.date}-${tx.name}-${index}`} className="border-t border-emerald-900/60 transition-colors odd:bg-emerald-950/10 hover:bg-emerald-900/25">
                      <td className="whitespace-nowrap border-t border-emerald-900/45 px-4 py-3 text-emerald-100/75">{formatDate(tx.date)}</td>
                      <td className="whitespace-nowrap border-t border-emerald-900/45 px-4 py-3 text-emerald-200/55">{tx.time?.slice(0, 5) || "—"}</td>
                      <td className="max-w-72 truncate border-t border-emerald-900/45 px-4 py-3 font-semibold text-white">{tx.name || "—"}</td>
                      <td className="border-t border-emerald-900/45 px-4 py-3 text-emerald-200/70">{tx.type || "—"}</td>
                      <td className="max-w-[28rem] truncate border-t border-emerald-900/45 px-4 py-3 text-emerald-200/55">{tx.detail || "—"}</td>
                      <td className={`whitespace-nowrap border-t border-emerald-900/45 px-4 py-3 text-right text-base font-black ${tx.value >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                        {formatCurrency(tx.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 border-t border-emerald-900/70 p-4 md:hidden">
              <DesktopRecommendedNotice />
              {paginatedTransactions.map((tx, index) => (
                <TransactionMobileCard key={tx._id ?? `${tx.date}-${tx.name}-${index}`} tx={tx} />
              ))}
            </div>
            <div className="flex flex-col gap-3 border-t border-emerald-900/70 p-4 text-sm text-emerald-100/65 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Página {currentPage} de {totalPages}. Exibindo {paginatedTransactions.length} de {filteredTransactions.length} registro(s) do recorte.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={currentPage <= 1}
                  className="rounded-xl border border-emerald-800/60 px-4 py-2 font-semibold text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={currentPage >= totalPages}
                  className="rounded-xl border border-emerald-800/60 px-4 py-2 font-semibold text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState text="Nenhuma transação encontrada para os filtros atuais." />
        )}
      </CardShell>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard icon={ArrowUpRight} label="Total contribuições" value={txSummary ? formatCurrency(txSummary.totalReceived) : "—"} sub={`${txSummary?.receivedCount ?? 0} contribuições registradas`} tone="emerald" />
        <MetricCard icon={ArrowDownRight} label="Despesas pagas" value={txSummary ? formatCurrency(txSummary.totalSent) : "—"} sub={`${txSummary?.sentCount ?? 0} pagamentos lançados`} tone="red" />
        <MetricCard icon={Users} label="Associados ativos" value={assocSummary ? String(assocSummary.ativos) : "—"} sub={`${assocSummary?.inadimplentes ?? 0} inadimplente(s)`} tone="outline" />
        <MetricCard icon={FileText} label="Registros únicos" value={String(txSummary?.totalTransactions ?? 0)} sub="Transações consolidadas no sistema" tone="deep" />
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-[1.35fr_0.9fr] gap-6">
        <CardShell className="p-4 sm:p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Fluxo anual</h2>
              <p className="text-sm text-emerald-200/55">Evolução de contribuições, despesas e saldo acumulado nos últimos meses.</p>
              <DesktopRecommendedNotice className="mt-3 md:hidden" />
            </div>
            <span className="rounded-full border border-emerald-700/50 px-3 py-1 text-xs text-emerald-200/70">Últimos 12 meses</span>
          </div>
          <div className="h-72 sm:h-80">
            {chartFlow.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartFlow} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#115e59" strokeOpacity={0.22} vertical={false} />
                  <XAxis dataKey="label" stroke="#6ee7b7" tick={{ fill: "#a7f3d0", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6ee7b7" tick={{ fill: "#a7f3d0", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                  <Tooltip cursor={{ fill: "rgba(16, 185, 129, 0.08)" }} contentStyle={{ background: "#022c22", border: "1px solid #047857", borderRadius: 16, color: "#ecfdf5" }} formatter={(value: unknown, name: unknown) => [formatCurrency(Number(value)), name === "received" ? "Contribuições" : name === "sent" ? "Despesas" : "Saldo acumulado"]} />
                  <Legend wrapperStyle={{ color: "#a7f3d0", fontSize: 12 }} />
                  <Bar dataKey="received" name="Contribuições" fill="#10b981" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="sent" name="Despesas" fill="#ef4444" radius={[8, 8, 0, 0]} />
                  <Line type="monotone" dataKey="balance" name="Saldo acumulado" stroke="#60a5fa" strokeWidth={3} dot={{ r: 3, fill: "#60a5fa" }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="Sem dados mensais suficientes para o gráfico." />
            )}
          </div>
        </CardShell>

        <CardShell className="p-4 sm:p-5">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-white">Contribuintes assíduos</h2>
            <p className="text-sm text-emerald-200/55">Maiores contribuições acumuladas no histórico importado.</p>
          </div>
          {topContributors?.length ? (
            <div className="space-y-3">
              {topContributors.map((item, index) => {
                const max = topContributors[0]?.total || 1;
                const percent = Math.max(8, Math.round((item.total / max) * 100));
                return (
                  <div key={item.name} className="grid grid-cols-[minmax(7rem,13rem)_1fr] items-center gap-3 text-sm">
                    <span className="truncate text-emerald-100/70">{index + 1}. {item.name}</span>
                    <div className="relative h-8 overflow-hidden rounded-lg bg-emerald-950/70 ring-1 ring-emerald-900/80">
                      <div className="h-full rounded-lg bg-gradient-to-r from-emerald-700 to-emerald-400" style={{ width: `${percent}%` }} />
                      <span className="absolute inset-y-0 left-3 flex items-center justify-start text-[0.66rem] font-bold leading-none text-white/90">{formatCurrency(item.total)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState text="Sem contribuições suficientes para ranquear associados." />
          )}
        </CardShell>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <CardShell className="p-4">
          <FileText className="mb-3 h-5 w-5 text-emerald-300" />
          <p className="font-bold text-white">{txSummary?.totalTransactions ?? 0} registros</p>
          <p className="text-emerald-200/55">Transações únicas consolidadas.</p>
        </CardShell>
        <CardShell className="p-4">
          <CalendarDays className="mb-3 h-5 w-5 text-emerald-300" />
          <p className="font-bold text-white">{pendingReservations} reserva(s)</p>
          <p className="text-emerald-200/55">Pendentes de confirmação.</p>
        </CardShell>
        <CardShell className="p-4">
          <Wrench className="mb-3 h-5 w-5 text-emerald-300" />
          <p className="font-bold text-white">{openMaintenances} chamado(s)</p>
          <p className="text-emerald-200/55">Abertos para acompanhamento.</p>
        </CardShell>
      </div>
    </div>
  );
}
