/**
 * portal/reservas/page.tsx — Reservas de áreas comuns
 * Lista reservas da unidade e permite criar novas.
 */
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useConvexQuery, convexMutation } from "@/lib/convex";
import { formatDate } from "@/lib/utils";

type Reservation = {
  _id: string;
  area: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "pendente" | "confirmada" | "cancelada";
  notes?: string;
};

// Badge de status
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pendente:   "bg-yellow-900/50 text-yellow-300",
    confirmada: "bg-emerald-900/50 text-emerald-300",
    cancelada:  "bg-gray-800 text-gray-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? "bg-gray-800 text-gray-400"}`}>
      {status}
    </span>
  );
}

const AREAS = ["Salão de Festas", "Churrasqueira", "Piscina", "Quadra Poliesportiva"];

export default function ReservasPage() {
  const { session } = useAuth();

  const { data: reservas, loading, error, reload } = useConvexQuery<Reservation[]>(
    "reservations:getReservationsByUnit",
    { unit: session?.unit ?? "" },
    !session
  );

  // Estado do formulário de nova reserva
  const [form, setForm] = useState({ area: AREAS[0], date: "", startTime: "", endTime: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  if (!session) return null;

  // Data mínima: hoje
  const today = new Date().toISOString().slice(0, 10);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    if (!form.date || !form.startTime || !form.endTime) {
      setMsg({ type: "err", text: "Preencha data, hora início e hora fim." });
      return;
    }

    setSubmitting(true);
    setMsg(null);
    try {
      await convexMutation("reservations:createReservation", {
        area: form.area,
        unit: session.unit,
        residentName: session.name,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        notes: form.notes || undefined,
        status: "pendente",
        sessionToken: session.token,
      });
      setMsg({ type: "ok", text: "Reserva solicitada! Aguarde confirmação da administração." });
      setForm({ area: AREAS[0], date: "", startTime: "", endTime: "", notes: "" });
      reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao criar reserva";
      setMsg({ type: "err", text: message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">

      <div>
        <h2 className="text-xl font-bold text-white">Reservas</h2>
        <p className="text-sm text-gray-400 mt-1">Áreas comuns — Unidade {session.unit}</p>
      </div>

      {/* Formulário de nova reserva */}
      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-medium text-gray-300">➕ Nova Reserva</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Área</label>
            <select
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              {AREAS.map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Data</label>
            <input
              type="date"
              min={today}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            {/* Coluna vazia para alinhamento no grid */}
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Hora início</label>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Hora fim</label>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Observações (opcional)</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Ex: aniversário, número de convidados…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {msg && (
          <p className={`text-sm px-3 py-2 rounded-lg ${msg.type === "ok" ? "bg-emerald-900/40 text-emerald-300" : "bg-red-900/40 text-red-300"}`}>
            {msg.text}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors"
        >
          {submitting ? "Enviando…" : "Solicitar Reserva"}
        </button>
      </form>

      {/* Lista de reservas */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">📋 Minhas Reservas</h3>

        {loading ? (
          <div className="text-gray-400 text-center py-4 text-sm">Carregando…</div>
        ) : error ? (
          <div className="text-red-400 text-sm">{error}</div>
        ) : !reservas || reservas.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-4">Nenhuma reserva encontrada.</div>
        ) : (
          <div className="space-y-2">
            {reservas.map((r) => (
              <div key={r._id} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                <div>
                  <p className="text-sm text-white">{r.area}</p>
                  <p className="text-xs text-gray-400">{formatDate(r.date)} • {r.startTime}–{r.endTime}</p>
                  {r.notes && <p className="text-xs text-gray-500 mt-0.5">{r.notes}</p>}
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
