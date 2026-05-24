"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useConvexQuery } from "@/lib/convex";

type BoardActionLog = {
  _id: string;
  actorUserId: string;
  actorName: string;
  actorRole: "diretoria";
  action: string;
  entity: string;
  entityId: string;
  entityLabel?: string;
  summary: string;
  before?: string;
  after?: string;
  createdAt: number;
};

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    "associate.create": "Criação de associado",
    "associate.update": "Edição cadastral",
    "associate.status.update": "Alteração de status",
  };
  return labels[action] ?? action;
}

function parseSnapshot(snapshot?: string) {
  if (!snapshot) return null;
  try {
    return JSON.parse(snapshot) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function SnapshotDiff({ before, after }: { before?: string; after?: string }) {
  const beforeData = parseSnapshot(before);
  const afterData = parseSnapshot(after);

  if (!beforeData && !afterData) {
    return <span className="text-xs text-gray-500">Sem detalhes estruturados.</span>;
  }

  const keys = Array.from(new Set([...Object.keys(beforeData ?? {}), ...Object.keys(afterData ?? {})]));
  const changedKeys = keys.filter((key) => String(beforeData?.[key] ?? "") !== String(afterData?.[key] ?? ""));

  if (changedKeys.length === 0) {
    return <span className="text-xs text-gray-500">Nenhuma diferença material registrada.</span>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950/70">
      <table className="w-full min-w-[560px] text-xs">
        <thead className="bg-gray-900/80 text-gray-400">
          <tr>
            <th className="px-3 py-2 text-left">Campo</th>
            <th className="px-3 py-2 text-left">Antes</th>
            <th className="px-3 py-2 text-left">Depois</th>
          </tr>
        </thead>
        <tbody>
          {changedKeys.map((key) => (
            <tr key={key} className="border-t border-gray-800/70">
              <td className="px-3 py-2 font-semibold text-emerald-200">{key}</td>
              <td className="px-3 py-2 text-gray-400">{String(beforeData?.[key] ?? "—")}</td>
              <td className="px-3 py-2 text-gray-200">{String(afterData?.[key] ?? "—")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AuditoriaDiretoriaPage() {
  const { session } = useAuth();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: logs, loading, error } = useConvexQuery<BoardActionLog[]>(
    "boardActionLogs:list",
    session ? { sessionToken: session.token, limit: 200 } : undefined,
    !session || session.role !== "sysadmin"
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return logs ?? [];
    return (logs ?? []).filter((log) =>
      [log.actorName, log.action, log.entityLabel, log.summary, log.entityId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [logs, search]);

  if (!session) return null;

  if (session.role !== "sysadmin") {
    return (
      <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-6 text-red-100">
        <h2 className="text-xl font-bold">Acesso restrito</h2>
        <p className="mt-2 text-sm text-red-100/80">
          Os registros de ações da diretoria são acessíveis apenas pelo sysadmin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-emerald-900/60 bg-gray-900/70 p-5 shadow-xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300/80">Auditoria restrita</p>
        <h2 className="mt-2 text-2xl font-bold text-white">Registros de ações da Diretoria</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
          Esta tela lista alterações operacionais feitas por usuários com papel de diretoria. O acesso é limitado ao sysadmin para preservar a rastreabilidade interna sem expor trilhas administrativas a outros perfis.
        </p>
      </section>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por diretor, associado, ação ou resumo…"
          className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-500 md:w-[28rem]"
        />
        <span className="text-sm text-gray-400">{filtered.length} registro(s) encontrado(s)</span>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-center text-gray-400">Carregando auditoria…</div>
      ) : error ? (
        <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-200">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-center text-gray-400">Nenhum registro encontrado.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((log) => {
            const expanded = expandedId === log._id;
            return (
              <article key={log._id} className="rounded-2xl border border-gray-800 bg-gray-900/80 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-900/60 px-2.5 py-1 text-xs font-semibold text-emerald-200">{actionLabel(log.action)}</span>
                      <span className="rounded-full bg-gray-800 px-2.5 py-1 text-xs text-gray-300">{formatDateTime(log.createdAt)}</span>
                    </div>
                    <h3 className="text-base font-bold text-white">{log.summary}</h3>
                    <p className="text-sm text-gray-400">
                      Responsável: <span className="font-semibold text-gray-200">{log.actorName}</span>
                      {log.entityLabel ? <> · Registro: <span className="font-semibold text-gray-200">{log.entityLabel}</span></> : null}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : log._id)}
                    className="rounded-lg border border-gray-700 px-3 py-2 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-800"
                  >
                    {expanded ? "Ocultar detalhes" : "Ver detalhes"}
                  </button>
                </div>

                {expanded && (
                  <div className="mt-4 space-y-3">
                    <div className="grid gap-3 text-xs text-gray-400 md:grid-cols-3">
                      <div className="rounded-xl bg-gray-950/70 p-3">
                        <div className="uppercase tracking-wide text-gray-500">Entidade</div>
                        <div className="mt-1 font-semibold text-gray-200">{log.entity}</div>
                      </div>
                      <div className="rounded-xl bg-gray-950/70 p-3">
                        <div className="uppercase tracking-wide text-gray-500">ID do registro</div>
                        <div className="mt-1 break-all font-semibold text-gray-200">{log.entityId}</div>
                      </div>
                      <div className="rounded-xl bg-gray-950/70 p-3">
                        <div className="uppercase tracking-wide text-gray-500">Usuário executor</div>
                        <div className="mt-1 break-all font-semibold text-gray-200">{log.actorUserId}</div>
                      </div>
                    </div>
                    <SnapshotDiff before={log.before} after={log.after} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
