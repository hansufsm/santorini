/**
 * admin/reservas/page.tsx — Gestão de Reservas de Áreas Comuns
 * Permite confirmar, cancelar e visualizar todas as reservas.
 */
"use client";

import { useAuth } from "@/lib/auth";
import { useConvexQuery, convexMutation } from "@/lib/convex";
import { formatDate } from "@/lib/utils";

type Reservation = {
  _id: string;
  area: string;
  unit: string;
  residentName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "pendente" | "confirmada" | "cancelada";
  notes?: string;
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pendente:   "bg-yellow-900/50 text-yellow-300",
    confirmada: "bg-emerald-900/50 text-emerald-300",
    cancelada:  "bg-gray-800 text-gray-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? ""}`}>
      {status}
    </span>
  );
}

export default function ReservasAdminPage() {
  const { session } = useAuth();
  const { data: reservas, loading, error, reload } = useConvexQuery<Reservation[]>("reservations:getAllReservations");

  if (!session) return null;

  async function confirm(id: string) {
    if (!session) return;
    await convexMutation("reservations:updateReservation", { id, status: "confirmada", sessionToken: session.token });
    reload();
  }

  async function cancel(id: string) {
    if (!session) return;
    await convexMutation("reservations:deleteReservation", { id, sessionToken: session.token });
    reload();
  }

  // Separar pendentes das demais para destacá-las
  const pending = (reservas ?? []).filter((r) => r.status === "pendente");
  const others  = (reservas ?? []).filter((r) => r.status !== "pendente");

  return (
    <div className="space-y-6">

      <div>
        <h2 className="text-xl font-bold text-white">Reservas</h2>
        <p className="text-sm text-gray-400 mt-1">
          {pending.length} pendente(s) · {reservas?.length ?? 0} total
        </p>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-8">Carregando…</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : (
        <>
          {/* Pendentes — destaque */}
          {pending.length > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-yellow-700/50">
                <h3 className="text-sm font-medium text-yellow-300">⚠️ Aguardando Confirmação ({pending.length})</h3>
              </div>
              {pending.map((r) => (
                <div key={r._id} className="px-4 py-3 border-b border-yellow-700/20 last:border-0 flex justify-between items-center gap-4">
                  <div>
                    <p className="text-white text-sm font-medium">{r.area}</p>
                    <p className="text-xs text-gray-400">{r.residentName} · Unid. {r.unit}</p>
                    <p className="text-xs text-gray-400">{formatDate(r.date)} · {r.startTime}–{r.endTime}</p>
                    {r.notes && <p className="text-xs text-gray-500 mt-0.5">{r.notes}</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => confirm(r._id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg transition-colors"
                    >
                      ✓ Confirmar
                    </button>
                    <button
                      onClick={() => cancel(r._id)}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition-colors"
                    >
                      ✕ Cancelar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Demais reservas */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800">
              <h3 className="text-sm font-medium text-gray-300">📋 Histórico de Reservas</h3>
            </div>
            {others.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">Nenhum histórico ainda.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800/50">
                    <tr className="text-gray-400 text-xs uppercase">
                      <th className="text-left px-4 py-3">Data</th>
                      <th className="text-left px-4 py-3">Área</th>
                      <th className="text-left px-4 py-3">Unidade</th>
                      <th className="text-left px-4 py-3">Horário</th>
                      <th className="text-left px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {others.map((r) => (
                      <tr key={r._id} className="border-t border-gray-800/50">
                        <td className="px-4 py-2 text-gray-300">{formatDate(r.date)}</td>
                        <td className="px-4 py-2 text-gray-300">{r.area}</td>
                        <td className="px-4 py-2 text-gray-400">{r.unit}</td>
                        <td className="px-4 py-2 text-gray-400">{r.startTime}–{r.endTime}</td>
                        <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
}
