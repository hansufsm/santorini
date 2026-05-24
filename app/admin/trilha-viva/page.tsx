"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useConvexQuery } from "@/lib/convex";
import { formatTimestamp } from "@/lib/utils";
import { TRILHA_VIVA_GUIDES } from "@/lib/trilha-viva-content";

type UserRole = "sysadmin" | "diretoria" | "associado" | "morador";
type TrilhaStatus = "nao_iniciado" | "em_andamento" | "concluido" | "reiniciado";

type TrilhaVivaProgress = {
  _id: string;
  associationId: string;
  guideId: string;
  route: string;
  menuLabel: string;
  userId: string;
  userRole: UserRole;
  status: TrilhaStatus;
  lastOpenedAt?: number;
  completedAt?: number;
  restartedAt?: number;
  completionCount?: number;
  createdAt: number;
  updatedAt: number;
};

type RouteSummary = {
  route: string;
  menuLabel: string;
  total: number;
  completed: number;
  inProgress: number;
  restarted: number;
};

type TrilhaVivaSummary = {
  totals: Record<TrilhaStatus | "total", number>;
  byRoute: RouteSummary[];
  recent: TrilhaVivaProgress[];
};

const STATUS_LABEL: Record<TrilhaStatus, string> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  reiniciado: "Reiniciado",
};

const STATUS_STYLE: Record<TrilhaStatus, string> = {
  nao_iniciado: "border-slate-300/20 bg-slate-500/15 text-slate-200",
  em_andamento: "border-cyan-300/20 bg-cyan-500/15 text-cyan-100",
  concluido: "border-emerald-300/20 bg-emerald-500/15 text-emerald-100",
  reiniciado: "border-amber-300/20 bg-amber-500/15 text-amber-100",
};

const STATUS_FILTERS: Array<{ value: TrilhaStatus | "todos"; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluido", label: "Concluídos" },
  { value: "reiniciado", label: "Reiniciados" },
  { value: "nao_iniciado", label: "Não iniciados" },
];

const ROLE_FILTERS: Array<{ value: UserRole | "todos"; label: string }> = [
  { value: "todos", label: "Todos os perfis" },
  { value: "morador", label: "Moradores" },
  { value: "associado", label: "Associados" },
  { value: "diretoria", label: "Diretoria" },
  { value: "sysadmin", label: "Sysadmin" },
];

const DEFAULT_ASSOCIATION_ID = "amrts";

export default function AdminTrilhaVivaPage() {
  const { session } = useAuth();
  const [statusFilter, setStatusFilter] = useState<TrilhaStatus | "todos">("todos");
  const [roleFilter, setRoleFilter] = useState<UserRole | "todos">("todos");
  const [routeFilter, setRouteFilter] = useState<string>("todos");

  const summaryArgs = useMemo(
    () => ({
      sessionToken: session?.token ?? "",
      associationId: DEFAULT_ASSOCIATION_ID,
    }),
    [session?.token]
  );

  const listArgs = useMemo(
    () => ({
      sessionToken: session?.token ?? "",
      associationId: DEFAULT_ASSOCIATION_ID,
      ...(statusFilter === "todos" ? {} : { status: statusFilter }),
      ...(roleFilter === "todos" ? {} : { role: roleFilter }),
      ...(routeFilter === "todos" ? {} : { route: routeFilter }),
    }),
    [roleFilter, routeFilter, session?.token, statusFilter]
  );

  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
  } = useConvexQuery<TrilhaVivaSummary>("trilhaViva:getProgressSummary", summaryArgs, !session?.token);

  const {
    data: progress,
    loading: progressLoading,
    error: progressError,
  } = useConvexQuery<TrilhaVivaProgress[]>("trilhaViva:listProgress", listArgs, !session?.token);

  const items = progress ?? [];
  const totals = summary?.totals ?? { total: 0, nao_iniciado: 0, em_andamento: 0, concluido: 0, reiniciado: 0 };
  const difficultyPoints = useMemo(() => {
    return [...(summary?.byRoute ?? [])]
      .map((route) => ({
        ...route,
        pending: Math.max(route.total - route.completed, 0),
        completionRate: route.total > 0 ? Math.round((route.completed / route.total) * 100) : 0,
      }))
      .filter((route) => route.pending > 0 || route.restarted > 0)
      .sort((a, b) => b.pending + b.restarted - (a.pending + a.restarted))
      .slice(0, 4);
  }, [summary?.byRoute]);

  if (!session) return null;

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-2xl border border-emerald-300/10 bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-900 p-5 shadow-xl shadow-black/20">
        <p className="text-xs uppercase tracking-[0.22em] text-emerald-300/70">Aprendizagem contextual</p>
        <div className="mt-2 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Trilha Viva Santorini</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-100/65">
              Painel de acompanhamento dos microtutoriais exibidos por perfil, área e menu no portal do associado. Use os indicadores para descobrir onde moradores e associados precisam de orientação mais clara.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Registros" value={totals.total} />
            <Metric label="Concluídos" value={totals.concluido} />
            <Metric label="Em andamento" value={totals.em_andamento} />
            <Metric label="Reiniciados" value={totals.reiniciado} />
          </div>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-lg shadow-black/10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Pontos de dificuldade</h3>
              <p className="mt-1 text-sm text-slate-400">Menus com maior quantidade de usuários ainda sem concluir ou com reinícios recentes.</p>
            </div>
          </div>

          {summaryLoading ? (
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-400">Calculando pontos de atenção…</div>
          ) : summaryError ? (
            <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">{summaryError}</div>
          ) : difficultyPoints.length === 0 ? (
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-400">
              Ainda não há dados suficientes para identificar dificuldades. Os registros serão formados quando os usuários abrirem a Trilha Viva no portal.
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {difficultyPoints.map((route) => (
                <article key={route.route} className="rounded-xl border border-emerald-300/10 bg-emerald-500/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-emerald-100">{route.menuLabel}</p>
                      <p className="mt-1 text-xs text-slate-500">{route.route}</p>
                    </div>
                    <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-100">
                      {route.pending} pendente{route.pending === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-emerald-400" style={{ width: `${route.completionRate}%` }} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <MiniMetric label="Taxa" value={`${route.completionRate}%`} />
                    <MiniMetric label="Andamento" value={route.inProgress} />
                    <MiniMetric label="Reinícios" value={route.restarted} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-lg shadow-black/10">
          <h3 className="text-lg font-semibold text-white">Cobertura instrucional</h3>
          <p className="mt-1 text-sm text-slate-400">Guias configurados por menu e perfis habilitados.</p>
          <div className="mt-4 space-y-3">
            {TRILHA_VIVA_GUIDES.map((guide) => (
              <div key={guide.route} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-100">{guide.menuLabel}</p>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200">{guide.badge}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{guide.route}</p>
                <p className="mt-2 text-xs text-slate-400">Perfis: {guide.allowedRoles.join(", ")}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Registros de progresso</h3>
            <p className="mt-1 text-sm text-slate-400">Filtre por status, perfil e rota para investigar adoção por público.</p>
          </div>
          <p className="text-sm text-emerald-200/70">{items.length} registro{items.length === 1 ? "" : "s"} no filtro atual</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                statusFilter === filter.value
                  ? "border-emerald-300/40 bg-emerald-400 text-emerald-950"
                  : "border-emerald-300/10 bg-slate-900 text-emerald-100/70 hover:border-emerald-300/30 hover:text-white"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <label className="block rounded-xl border border-slate-800 bg-slate-950 p-3">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Perfil</span>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as UserRole | "todos")}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-300/50"
            >
              {ROLE_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>{filter.label}</option>
              ))}
            </select>
          </label>

          <label className="block rounded-xl border border-slate-800 bg-slate-950 p-3">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Menu</span>
            <select
              value={routeFilter}
              onChange={(event) => setRouteFilter(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-300/50"
            >
              <option value="todos">Todos os menus</option>
              {TRILHA_VIVA_GUIDES.map((guide) => (
                <option key={guide.route} value={guide.route}>{guide.menuLabel}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {progressLoading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-400">Carregando progresso da Trilha Viva…</div>
      ) : progressError ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-5 text-red-100">{progressError}</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-400">
          Nenhum registro encontrado para os filtros selecionados.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-lg shadow-black/10">
          <div className="hidden grid-cols-[1.1fr_0.9fr_0.7fr_0.9fr_0.9fr] gap-3 border-b border-slate-800 bg-slate-900/80 px-5 py-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-500 lg:grid">
            <span>Menu</span>
            <span>Perfil</span>
            <span>Status</span>
            <span>Última abertura</span>
            <span>Conclusões</span>
          </div>
          <div className="divide-y divide-slate-800">
            {items.map((item) => (
              <article key={item._id} className="grid gap-3 px-5 py-4 text-sm text-slate-300 lg:grid-cols-[1.1fr_0.9fr_0.7fr_0.9fr_0.9fr] lg:items-center">
                <div className="min-w-0">
                  <p className="font-medium text-slate-100">{item.menuLabel}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{item.route}</p>
                  <p className="mt-1 truncate text-[11px] text-slate-600">Guia: {item.guideId}</p>
                </div>
                <div>
                  <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs capitalize text-slate-300">{item.userRole}</span>
                  <p className="mt-2 truncate text-[11px] text-slate-600">Usuário: {item.userId}</p>
                </div>
                <div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[item.status]}`}>
                    {STATUS_LABEL[item.status]}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  <p>{formatTimestamp(item.lastOpenedAt ?? item.updatedAt)}</p>
                  {item.restartedAt && <p className="mt-1 text-amber-200/70">Reiniciado em {formatTimestamp(item.restartedAt)}</p>}
                </div>
                <div className="text-xs text-slate-400">
                  <p>{item.completionCount ?? 0} conclusão{(item.completionCount ?? 0) === 1 ? "" : "ões"}</p>
                  {item.completedAt && <p className="mt-1 text-emerald-200/70">Última: {formatTimestamp(item.completedAt)}</p>}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-emerald-300/10 bg-emerald-500/10 px-4 py-3 text-center">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-xs text-emerald-100/55">{label}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-950/70 px-2 py-2">
      <p className="font-semibold text-slate-100">{value}</p>
      <p className="mt-0.5 text-slate-500">{label}</p>
    </div>
  );
}
