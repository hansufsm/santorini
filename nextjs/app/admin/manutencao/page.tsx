/**
 * admin/manutencao/page.tsx — Gestão de Chamados de Manutenção
 * Atualizar status dos chamados abertos pelos moradores.
 */
"use client";

import { useAuth } from "@/lib/auth";
import { useConvexQuery, convexMutation } from "@/lib/convex";
import { formatTimestamp } from "@/lib/utils";

type Maintenance = {
  _id: string;
  title: string;
  description?: string;
  area?: string;
  priority: "baixa" | "media" | "alta" | "urgente";
  status: "aberto" | "em_andamento" | "concluido" | "cancelado";
  createdAt: number;
};

const PRIORITY_STYLE: Record<string, string> = {
  baixa:   "bg-green-900/50 text-green-300",
  media:   "bg-yellow-900/50 text-yellow-300",
  alta:    "bg-orange-900/50 text-orange-300",
  urgente: "bg-red-900/50 text-red-300",
};

const STATUS_STYLE: Record<string, string> = {
  aberto:       "bg-blue-900/50 text-blue-300",
  em_andamento: "bg-yellow-900/50 text-yellow-300",
  concluido:    "bg-emerald-900/50 text-emerald-300",
  cancelado:    "bg-gray-800 text-gray-400",
};

const STATUS_LABEL: Record<string, string> = {
  aberto: "Aberto", em_andamento: "Em Andamento", concluido: "Concluído", cancelado: "Cancelado",
};

export default function ManutencaoPage() {
  const { session } = useAuth();
  const { data: chamados, loading, error, reload } = useConvexQuery<Maintenance[]>(
    "maintenances:getAllMaintenances"
  );

  if (!session) return null;

  async function updateStatus(id: string, status: Maintenance["status"]) {
    if (!session) return;
    await convexMutation("maintenances:updateMaintenance", { id, status, sessionToken: session.token });
    reload();
  }

  async function handleDelete(id: string) {
    if (!session || !confirm("Cancelar e inativar este chamado?")) return;
    await convexMutation("maintenances:deleteMaintenance", { id, sessionToken: session.token });
    reload();
  }

  const active = (chamados ?? []).filter((c) => c.status === "aberto" || c.status === "em_andamento");
  const closed = (chamados ?? []).filter((c) => c.status === "concluido" || c.status === "cancelado");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Manutenção</h2>
        <p className="text-sm text-gray-400 mt-1">{active.length} ativo(s) · {chamados?.length ?? 0} total</p>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-8">Carregando…</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : (
        <>
          <div className="space-y-3">
            <h3 className="text-xs text-gray-500 uppercase tracking-wide">Ativos ({active.length})</h3>
            {active.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center text-gray-500 text-sm">Nenhum chamado ativo. ✅</div>
            ) : active.map((c) => (
              <div key={c._id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div>
                    <p className="text-white font-medium">{c.title}</p>
                    {c.area && <p className="text-xs text-gray-400 mt-0.5">📍 {c.area}</p>}
                    {c.description && <p className="text-xs text-gray-500 mt-1">{c.description}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${PRIORITY_STYLE[c.priority]}`}>{c.priority}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_STYLE[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {c.status === "aberto" && (
                    <button onClick={() => updateStatus(c._id, "em_andamento")} className="px-3 py-1 bg-yellow-700 hover:bg-yellow-600 text-white text-xs rounded-lg transition-colors">▶ Iniciar</button>
                  )}
                  {c.status === "em_andamento" && (
                    <button onClick={() => updateStatus(c._id, "concluido")} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg transition-colors">✓ Concluir</button>
                  )}
                  <button onClick={() => handleDelete(c._id)} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition-colors">✕ Cancelar</button>
                </div>
                <p className="text-xs text-gray-600 mt-2">{formatTimestamp(c.createdAt)}</p>
              </div>
            ))}
          </div>

          {closed.length > 0 && (
            <div>
              <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-3">Histórico ({closed.length})</h3>
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800/50">
                    <tr className="text-gray-400 text-xs uppercase">
                      {["Título", "Área", "Prioridade", "Status", "Data"].map((h) => (
                        <th key={h} className="text-left px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {closed.map((c) => (
                      <tr key={c._id} className="border-t border-gray-800/50">
                        <td className="px-4 py-2 text-gray-400">{c.title}</td>
                        <td className="px-4 py-2 text-gray-500">{c.area ?? "—"}</td>
                        <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs ${PRIORITY_STYLE[c.priority]}`}>{c.priority}</span></td>
                        <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_STYLE[c.status]}`}>{STATUS_LABEL[c.status]}</span></td>
                        <td className="px-4 py-2 text-gray-500">{formatTimestamp(c.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
