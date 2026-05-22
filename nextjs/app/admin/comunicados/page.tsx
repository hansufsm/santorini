/**
 * admin/comunicados/page.tsx — Gestão de Comunicados
 * Criar, ativar/desativar e remover comunicados.
 */
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useConvexQuery, convexMutation } from "@/lib/convex";
import { formatTimestamp } from "@/lib/utils";

type Announcement = {
  _id: string;
  title: string;
  content: string;
  type: "info" | "urgente" | "manutencao" | "evento";
  active: boolean;
  createdAt: number;
};

const TYPES = ["info", "urgente", "manutencao", "evento"] as const;
const TYPE_LABEL: Record<string, string> = { info: "Informativo", urgente: "Urgente", manutencao: "Manutenção", evento: "Evento" };
const TYPE_BADGE: Record<string, string> = {
  info:       "bg-blue-900/50 text-blue-300",
  urgente:    "bg-red-900/50 text-red-300",
  manutencao: "bg-yellow-900/50 text-yellow-300",
  evento:     "bg-purple-900/50 text-purple-300",
};

export default function ComunicadosAdminPage() {
  const { session } = useAuth();
  const { data: comunicados, loading, error, reload } = useConvexQuery<Announcement[]>("announcements:getAllAnnouncements");

  const [form, setForm] = useState({ title: "", content: "", type: "info" as string, active: true });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  if (!session) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !form.title || !form.content) {
      setMsg({ type: "err", text: "Título e conteúdo são obrigatórios." });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      await convexMutation("announcements:createAnnouncement", {
        title: form.title,
        content: form.content,
        type: form.type,
        active: form.active,
        sessionToken: session.token,
      });
      setMsg({ type: "ok", text: "Comunicado publicado com sucesso!" });
      setForm({ title: "", content: "", type: "info", active: true });
      reload();
    } catch (err: unknown) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Erro ao criar" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!session || !confirm("Inativar este comunicado?")) return;
    await convexMutation("announcements:deleteAnnouncement", { id, sessionToken: session.token });
    reload();
  }

  return (
    <div className="space-y-6">

      <div>
        <h2 className="text-xl font-bold text-white">Comunicados</h2>
        <p className="text-sm text-gray-400 mt-1">Publicar e gerenciar avisos para os moradores</p>
      </div>

      {/* Formulário de criação */}
      <form onSubmit={handleCreate} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-medium text-gray-300">➕ Novo Comunicado</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Título</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Título do comunicado"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Tipo</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
          </div>

          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-emerald-500"
              />
              <span className="text-sm text-gray-300">Publicar imediatamente</span>
            </label>
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Conteúdo</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={4}
              placeholder="Texto do comunicado…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
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
          {submitting ? "Publicando…" : "Publicar Comunicado"}
        </button>
      </form>

      {/* Lista */}
      {loading ? (
        <div className="text-gray-400 text-center py-6">Carregando…</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : (
        <div className="space-y-3">
          {(!comunicados || comunicados.length === 0) ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-gray-500">Nenhum comunicado.</div>
          ) : comunicados.map((c) => (
            <div key={c._id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[c.type]}`}>{TYPE_LABEL[c.type]}</span>
                  {!c.active && <span className="px-2 py-0.5 rounded-full text-xs bg-gray-800 text-gray-400">Inativo</span>}
                  <span className="text-xs text-gray-500">{formatTimestamp(c.createdAt)}</span>
                </div>
                <button
                  onClick={() => handleDelete(c._id)}
                  className="text-gray-500 hover:text-red-400 text-xs flex-shrink-0 transition-colors"
                  title="Inativar comunicado"
                >
                  ✕ Inativar
                </button>
              </div>
              <h4 className="text-white font-medium mt-2">{c.title}</h4>
              <p className="text-gray-400 text-sm mt-1 line-clamp-2">{c.content}</p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
