"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AreaChart,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Bell,
  CalendarDays,
  Download,
  FileText,
  Search,
  Settings,
  ShieldCheck,
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
import { formatCurrency, formatDate } from "@/lib/utils";

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

type Shortcut = {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const EXPENSE_COLORS = ["#f59e0b", "#ef4444", "#3b82f6", "#14b8a6", "#a855f7", "#84cc16"];

function monthLabel(monthKey: string) {
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
      className={`relative overflow-hidden rounded-3xl p-4 sm:p-5 min-h-36 shadow-xl ${classes}`}
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

function EmptyState({ text }: { text: string }) {
  return <div className="py-12 text-center text-sm text-emerald-200/50">{text}</div>;
}

export default function AdminPage() {
  const { session } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");

  const { data: txSummary } = useConvexQuery<TxSummary>("transactions:getSummary");
  const { data: assocSummary } = useConvexQuery<AssocSummary>("associates:getAssociatesSummary");
  const { data: reservas } = useConvexQuery<Reservation[]>("reservations:getAllReservations");
  const { data: chamados } = useConvexQuery<Maintenance[]>("maintenances:getAllMaintenances");
  const { data: txList, loading: txLoading } = useConvexQuery<Transaction[]>("transactions:getAllTransactions");
  const { data: monthlyFlow } = useConvexQuery<MonthlyFlow[]>("transactions:getMonthlyFlow", { months: 6 });
  const { data: topContributors } = useConvexQuery<TopContributor[]>("transactions:getTopContributors", { limit: 5 });

  const pendingReservations = reservas?.filter((r) => r.status === "pendente").length ?? 0;
  const openMaintenances = chamados?.filter((m) => m.status === "aberto").length ?? 0;

  const months = useMemo(() => {
    const source = txList ?? [];
    return Array.from(new Set(source.map((tx) => tx.date?.slice(0, 7)).filter(Boolean))).sort().reverse();
  }, [txList]);

  const filteredTransactions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (txList ?? [])
      .filter((tx) => selectedMonth === "all" || tx.date?.startsWith(selectedMonth))
      .filter((tx) => {
        if (!term) return true;
        return [tx.name, tx.type, tx.detail, tx.date].some((field) => field?.toLowerCase().includes(term));
      })
      .slice(0, 80);
  }, [txList, selectedMonth, search]);

  const expenseDistribution = useMemo(() => {
    const totals = new Map<string, number>();
    for (const tx of txList ?? []) {
      if (tx.value >= 0) continue;
      const key = normalizeType(tx.type || tx.detail);
      totals.set(key, (totals.get(key) ?? 0) + Math.abs(tx.value));
    }
    const sorted = Array.from(totals, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    if (sorted.length <= 5) return sorted;
    const head = sorted.slice(0, 4);
    const other = sorted.slice(4).reduce((acc, item) => acc + item.value, 0);
    return [...head, { name: "Outros / Tarifas", value: other }];
  }, [txList]);

  const chartFlow = useMemo(() => {
    let accumulated = 0;
    return (monthlyFlow ?? []).map((item) => {
      accumulated += item.received - item.sent;
      return {
        ...item,
        label: monthLabel(item.month),
        balance: accumulated,
      };
    });
  }, [monthlyFlow]);

  const shortcuts: Shortcut[] = [
    { href: "/admin/transacoes", title: "Transações", description: "Importar CSV e revisar extrato", icon: Banknote },
    { href: "/admin/associados", title: "Associados", description: "Cadastro, status e inadimplência", icon: Users },
    { href: "/admin/diretoria", title: "Gestão da Diretoria", description: "Promover associados e revogar acessos administrativos", icon: ShieldCheck },
    { href: "/admin/comunicados", title: "Comunicados", description: "Publicar avisos oficiais", icon: Bell },
    { href: "/admin/reservas", title: "Reservas", description: `${pendingReservations} pendente(s)`, icon: CalendarDays },
    { href: "/admin/manutencao", title: "Manutenção", description: `${openMaintenances} chamado(s) aberto(s)`, icon: Wrench },
    { href: "/admin/usuarios", title: "Usuários", description: "Acessos e permissões", icon: Settings },
  ].filter((item) => session?.role === "sysadmin" || !["/admin/usuarios", "/admin/diretoria"].includes(item.href));

  if (!session) return null;

  return (
    <div className="page-fade space-y-6 pb-8">
      <CardShell className="relative overflow-hidden p-5 sm:p-7 min-h-48">
        <div className="absolute inset-0 opacity-30">
          <img src="/santorini.webp" alt="Residencial Santorini" className="h-full w-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-[#022c22]/95 via-[#064e3b]/90 to-[#065f46]/70" />
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-200 ring-1 ring-emerald-300/20">
              Diretoria Santorini
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
              Dashboard executivo
            </h1>
            <p className="mt-3 max-w-xl text-sm sm:text-base leading-relaxed text-emerald-50/75">
              Gestão financeira, acompanhamento operacional e histórico de transações em uma visão única para tomada de decisão.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-950/40 px-4 py-3 text-left lg:text-right backdrop-blur-md">
            <p className="text-xs uppercase tracking-widest text-emerald-200/60">Usuário logado</p>
            <p className="mt-1 font-bold text-white">{session.name}</p>
            <p className="text-sm capitalize text-emerald-300">{session.role}</p>
          </div>
        </div>
      </CardShell>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          icon={ArrowUpRight}
          label="Total Contribuições"
          value={txSummary ? formatCurrency(txSummary.totalReceived) : "—"}
          sub={`${txSummary?.receivedCount ?? 0} contribuições registradas`}
          tone="emerald"
        />
        <MetricCard
          icon={ArrowDownRight}
          label="Despesas Pagas"
          value={txSummary ? formatCurrency(txSummary.totalSent) : "—"}
          sub={`${txSummary?.sentCount ?? 0} pagamentos lançados`}
          tone="red"
        />
        <MetricCard
          icon={AreaChart}
          label="Saldo em Caixa"
          value={txSummary ? formatCurrency(txSummary.netBalance) : "—"}
          sub="Disponível para imprevistos"
          tone="deep"
        />
        <MetricCard
          icon={Users}
          label="Associados"
          value={assocSummary ? String(assocSummary.ativos) : "—"}
          sub={`${assocSummary?.inadimplentes ?? 0} inadimplente(s)`}
          tone="outline"
        />
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-[1.35fr_0.9fr] gap-6">
        <CardShell className="p-4 sm:p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Fluxo mensal</h2>
              <p className="text-sm text-emerald-200/55">Evolução de contribuições, despesas e saldo acumulado.</p>
            </div>
            <span className="rounded-full border border-emerald-700/50 px-3 py-1 text-xs text-emerald-200/70">Últimos 6 meses</span>
          </div>
          <div className="h-72 sm:h-80">
            {chartFlow.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartFlow} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#115e59" strokeOpacity={0.22} vertical={false} />
                  <XAxis dataKey="label" stroke="#6ee7b7" tick={{ fill: "#a7f3d0", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6ee7b7" tick={{ fill: "#a7f3d0", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                  <Tooltip
                    cursor={{ fill: "rgba(16, 185, 129, 0.08)" }}
                    contentStyle={{ background: "#022c22", border: "1px solid #047857", borderRadius: 16, color: "#ecfdf5" }}
                    formatter={(value: number, name: string) => [formatCurrency(Number(value)), name === "received" ? "Contribuições" : name === "sent" ? "Despesas" : "Saldo acumulado"]}
                  />
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
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Distribuição de despesas</h2>
              <p className="text-sm text-emerald-200/55">Categorias com maior impacto no caixa.</p>
            </div>
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
                  <Tooltip
                    contentStyle={{ background: "#022c22", border: "1px solid #047857", borderRadius: 16, color: "#ecfdf5" }}
                    formatter={(value: number) => formatCurrency(Number(value))}
                  />
                  <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ color: "#a7f3d0", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="Nenhuma despesa lançada ainda." />
            )}
          </div>
        </CardShell>
      </div>

      <CardShell className="p-4 sm:p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Contribuintes assíduos</h2>
            <p className="text-sm text-emerald-200/55">Maiores contribuições acumuladas no histórico importado.</p>
          </div>
          <Link href="/admin/associados" className="hidden sm:inline-flex text-sm font-medium text-emerald-300 hover:text-white">
            Ver todos
          </Link>
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
                    <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-white/90">{formatCurrency(item.total)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState text="Sem contribuições suficientes para ranquear associados." />
        )}
      </CardShell>

      <CardShell className="p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Atalhos de gestão</h2>
            <p className="text-sm text-emerald-200/55">Ações principais antes do histórico para reduzir navegação no mobile.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {shortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="group rounded-2xl border border-emerald-800/60 bg-emerald-950/40 p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-400/70 hover:bg-emerald-900/45">
                <Icon className="h-5 w-5 text-emerald-300 transition-colors group-hover:text-white" />
                <p className="mt-3 font-bold text-white">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-emerald-200/55">{item.description}</p>
              </Link>
            );
          })}
        </div>
      </CardShell>

      <CardShell className="overflow-hidden">
        <div className="border-b border-emerald-900/70 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Histórico de transações</h2>
              <p className="text-sm text-emerald-200/55">Consulta rápida aos lançamentos mais recentes.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-300/60" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nome ou tipo..."
                  className="w-full sm:w-72 rounded-xl border border-emerald-800/60 bg-emerald-950/50 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-emerald-200/35 outline-none transition-colors focus:border-emerald-400"
                />
              </div>
              <select
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="rounded-xl border border-emerald-800/60 bg-emerald-950/50 px-3 py-2.5 text-sm text-emerald-50 outline-none transition-colors focus:border-emerald-400"
              >
                <option value="all">Todos os meses</option>
                {months.map((month) => (
                  <option key={month} value={month}>{monthLabel(month)}</option>
                ))}
              </select>
              <Link href="/admin/transacoes" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500">
                <Download className="h-4 w-4" />
                Exportar
              </Link>
            </div>
          </div>
        </div>

        {txLoading ? (
          <EmptyState text="Carregando transações…" />
        ) : filteredTransactions.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-emerald-950/55 text-xs uppercase tracking-widest text-emerald-200/55">
                <tr>
                  <th className="px-4 py-4 text-left font-semibold">Data</th>
                  <th className="px-4 py-4 text-left font-semibold">Nome</th>
                  <th className="px-4 py-4 text-left font-semibold">Tipo</th>
                  <th className="px-4 py-4 text-left font-semibold">Detalhe</th>
                  <th className="px-4 py-4 text-right font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx, index) => (
                  <tr key={tx._id ?? `${tx.date}-${tx.name}-${index}`} className="border-t border-emerald-900/60 transition-colors hover:bg-emerald-900/20">
                    <td className="whitespace-nowrap px-4 py-3 text-emerald-100/75">{formatDate(tx.date)}</td>
                    <td className="max-w-64 truncate px-4 py-3 font-medium text-white">{tx.name || "—"}</td>
                    <td className="px-4 py-3 text-emerald-200/65">{tx.type || "—"}</td>
                    <td className="px-4 py-3 text-emerald-200/50">{tx.detail || "—"}</td>
                    <td className={`whitespace-nowrap px-4 py-3 text-right font-bold ${tx.value >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                      {formatCurrency(tx.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState text="Nenhuma transação encontrada para os filtros atuais." />
        )}
      </CardShell>

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
