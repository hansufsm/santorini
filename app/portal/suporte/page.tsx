/**
 * portal/suporte/page.tsx — Chamados de suporte / manutenção
 * Permite abrir chamados e visualizar o status de todos os chamados do condomínio.
 */
"use client";

import { useState } from "react";
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

// Estilos para prioridade
const PRIORITY_STYLE: Record<string, string> = {
  baixa:   "bg-green-900/50 text-green-300",
  media:   "bg-yellow-900/50 text-yellow-300",
  alta:    "bg-orange-900/50 text-orange-300",
  urgente: "bg-red-900/50 text-red-300",
};

// Estilos para status
const STATUS_STYLE: Record<string, string> = {
  aberto:       "bg-blue-900/50 text-blue-300",
  em_andamento: "bg-yellow-900/50 text-yellow-300",
  concluido:    "bg-emerald-900/50 text-emerald-300",
  cancelado:    "bg-gray-800 text-gray-400",
};

const AREAS = ["Elétrica", "Hidráulica", "Estrutura", "Área Comum", "Portaria", "Outro"];
const PRIORITIES = ["baixa", "media", "alta", "urgente"];

export default function SuportePage() {
  const { session } = useAuth();

  const { data: chamados, loading, error, reload } = useConvexQuery<Maintenance[]>(
    "maintenances:getAllMaintenances"
  );

  const [form, setForm] = useState({ title: "", area: AREAS[0], priority: "baixa" as string, description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  if (!session) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    if (!form.title.trim()) {
      setMsg({ type: "err", text: "O título é obrigatório." });
      return;
    }

    setSubmitting(true);
    setMsg(null);

    try {
      // Prefixar o título com a unidade para facilitar identificação pela administração
      const fullTitle = `[${session.unit}] ${form.title.trim()}`;

      await convexMutation("maintenances:createMaintenance", {
        title: fullTitle,
        area: form.area,
        priority: form.priority,
        description: form.description.trim() || undefined,
        status: "aberto",
        sessionToken: session.token,
      });

      setMsg({ type: "ok", text: "Chamado aberto com sucesso! A administração irá verificar em breve." });
      setForm({ title: "", area: AREAS[0], priority: "baixa", description: "" });
      reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao abrir chamado";
      setMsg({ type: "err", text: message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">

      <div>
        <h2 className="text-xl font-bold text-white">Suporte</h2>
        <p className="text-sm text-gray-400 mt-1">Chamados de manutenção e suporte do condomínio</p>
      </div>

      {/* Formulário de abertura de chamado */}
      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-medium text-gray-300">🔧 Abrir Chamado</h3>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Título</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Descreva o problema em poucas palavras"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
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
            <label className="block text-xs text-gray-400 mb-1">Prioridade</label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Descrição (opcional)</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="Detalhes adicionais sobre o problema…"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
          />
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
          {submitting ? "Enviando…" : "Abrir Chamado"}
        </button>
      </form>

      {/* Lista de chamados do condomínio */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">📋 Chamados do Condomínio</h3>

        {loading ? (
          <div className="text-gray-400 text-center py-4 text-sm">Carregando…</div>
        ) : error ? (
          <div className="text-red-400 text-sm">{error}</div>
        ) : !chamados || chamados.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-4">Nenhum chamado aberto.</div>
        ) : (
          <div className="space-y-3">
            {chamados.map((c) => (
              <div key={c._id} className="border border-gray-800 rounded-lg p-3">
                <div className="flex justify-between items-start gap-2">
                  <p className="text-sm text-white font-medium">{c.title}</p>
                  <div className="flex gap-1 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${PRIORITY_STYLE[c.priority]}`}>{c.priority}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_STYLE[c.status]}`}>{c.status.replace("_", " ")}</span>
                  </div>
                </div>
                {c.area && <p className="text-xs text-gray-400 mt-1">📍 {c.area}</p>}
                {c.description && <p className="text-xs text-gray-500 mt-1">{c.description}</p>}
                <p className="text-xs text-gray-600 mt-2">{formatTimestamp(c.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
