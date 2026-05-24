"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { convexMutation, useConvexQuery } from "@/lib/convex";
import { formatTimestamp } from "@/lib/utils";

type FeedbackStatus = "novo" | "em_analise" | "resolvido" | "arquivado";
type FeedbackCategory = "sugestao" | "problema" | "elogio" | "duvida" | "outro";

type CommunityFeedback = {
  _id: string;
  associationId: string;
  category: FeedbackCategory;
  message: string;
  url: string;
  route: string;
  userRole?: "sysadmin" | "diretoria" | "associado" | "morador";
  status: FeedbackStatus;
  createdAt: number;
  updatedAt: number;
};

const STATUS_LABEL: Record<FeedbackStatus, string> = {
  novo: "Novo",
  em_analise: "Em análise",
  resolvido: "Resolvido",
  arquivado: "Arquivado",
};

const STATUS_STYLE: Record<FeedbackStatus, string> = {
  novo: "bg-blue-500/15 text-blue-200 border-blue-300/20",
  em_analise: "bg-amber-500/15 text-amber-200 border-amber-300/20",
  resolvido: "bg-emerald-500/15 text-emerald-200 border-emerald-300/20",
  arquivado: "bg-slate-500/15 text-slate-300 border-slate-300/20",
};

const CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  sugestao: "Sugestão",
  problema: "Problema",
  elogio: "Elogio",
  duvida: "Dúvida",
  outro: "Outro",
};

const CATEGORY_STYLE: Record<FeedbackCategory, string> = {
  sugestao: "bg-emerald-500/10 text-emerald-200",
  problema: "bg-red-500/10 text-red-200",
  elogio: "bg-fuchsia-500/10 text-fuchsia-200",
  duvida: "bg-cyan-500/10 text-cyan-200",
  outro: "bg-slate-500/10 text-slate-200",
};

const STATUS_FILTERS: Array<{ value: FeedbackStatus | "todos"; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "novo", label: "Novos" },
  { value: "em_analise", label: "Em análise" },
  { value: "resolvido", label: "Resolvidos" },
  { value: "arquivado", label: "Arquivados" },
];

export default function AdminFeedbacksPage() {
  const { session } = useAuth();
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "todos">("todos");
  const queryArgs = useMemo(
    () => ({
      sessionToken: session?.token ?? "",
      associationId: "amrts",
      ...(statusFilter === "todos" ? {} : { status: statusFilter }),
    }),
    [session?.token, statusFilter]
  );

  const { data: feedbacks, loading, error, reload } = useConvexQuery<CommunityFeedback[]>(
    "feedbacks:listFeedbacks",
    queryArgs,
    !session?.token
  );

  const items = feedbacks ?? [];
  const openCount = items.filter((item) => item.status === "novo" || item.status === "em_analise").length;
  const resolvedCount = items.filter((item) => item.status === "resolvido").length;

  if (!session) return null;

  async function setStatus(id: string, status: FeedbackStatus) {
    if (!session) return;
    await convexMutation("feedbacks:updateFeedbackStatus", {
      sessionToken: session.token,
      id,
      status,
    });
    reload();
  }

  async function archive(id: string) {
    if (!session || !confirm("Arquivar este feedback?")) return;
    await convexMutation("feedbacks:archiveFeedback", {
      sessionToken: session.token,
      id,
    });
    reload();
  }

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-2xl border border-emerald-300/10 bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-900 p-5 shadow-xl shadow-black/20">
        <p className="text-xs uppercase tracking-[0.22em] text-emerald-300/70">Escuta ativa</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Feedback Comunitário</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100/65">
              Central de triagem das sugestões, dúvidas, elogios e problemas enviados pelo botão global do app. Use esta tela como radar de melhoria contínua.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Metric label="Recebidos" value={items.length} />
            <Metric label="Abertos" value={openCount} />
            <Metric label="Resolvidos" value={resolvedCount} />
          </div>
        </div>
      </header>

      <section className="flex flex-wrap gap-2">
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
      </section>

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-400">Carregando feedbacks…</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-5 text-red-100">{error}</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-400">
          Nenhum feedback encontrado para o filtro selecionado.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((feedback) => (
            <article key={feedback._id} className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-lg shadow-black/10">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${CATEGORY_STYLE[feedback.category]}`}>
                      {CATEGORY_LABEL[feedback.category]}
                    </span>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[feedback.status]}`}>
                      {STATUS_LABEL[feedback.status]}
                    </span>
                    {feedback.userRole && (
                      <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs capitalize text-slate-300">{feedback.userRole}</span>
                    )}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-100">{feedback.message}</p>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {feedback.status === "novo" && (
                    <button onClick={() => setStatus(feedback._id, "em_analise")} className="rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-100 transition hover:bg-amber-500/25">
                      Colocar em análise
                    </button>
                  )}
                  {feedback.status !== "resolvido" && feedback.status !== "arquivado" && (
                    <button onClick={() => setStatus(feedback._id, "resolvido")} className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-100 transition hover:bg-emerald-500/25">
                      Marcar resolvido
                    </button>
                  )}
                  {feedback.status !== "arquivado" && (
                    <button onClick={() => archive(feedback._id)} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700">
                      Arquivar
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-4 grid gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-400 md:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <p>Rota: <span className="text-slate-200">{feedback.route}</span></p>
                  <a href={feedback.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-emerald-300/80 hover:text-emerald-200">
                    {feedback.url}
                  </a>
                </div>
                <p className="text-slate-500">{formatTimestamp(feedback.createdAt)}</p>
              </div>
            </article>
          ))}
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
