/**
 * admin/comunicados/page.tsx — Gestão de Comunicados
 * Criar, editar, segmentar e inativar comunicados.
 */
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useConvexQuery, convexMutation } from "@/lib/convex";
import { formatTimestamp } from "@/lib/utils";

type AnnouncementType = "info" | "urgente" | "manutencao" | "evento";
type TargetRole = "morador" | "associado" | "diretoria" | "sysadmin";

type Announcement = {
  _id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  active: boolean;
  targetRoles?: TargetRole[];
  createdAt: number;
};

type AnnouncementForm = {
  title: string;
  content: string;
  type: AnnouncementType;
  active: boolean;
  targetRoles: TargetRole[];
};

const TYPES: AnnouncementType[] = ["info", "urgente", "manutencao", "evento"];
const TYPE_LABEL: Record<AnnouncementType, string> = {
  info: "Informativo",
  urgente: "Urgente",
  manutencao: "Manutenção",
  evento: "Evento",
};
const TYPE_BADGE: Record<AnnouncementType, string> = {
  info: "bg-blue-900/50 text-blue-300",
  urgente: "bg-red-900/50 text-red-300",
  manutencao: "bg-yellow-900/50 text-yellow-300",
  evento: "bg-purple-900/50 text-purple-300",
};

const ROLE_OPTIONS: { value: TargetRole; label: string }[] = [
  { value: "morador", label: "Moradores" },
  { value: "associado", label: "Associados" },
  { value: "diretoria", label: "Diretoria" },
  { value: "sysadmin", label: "Sysadmin" },
];

const emptyForm: AnnouncementForm = {
  title: "",
  content: "",
  type: "info",
  active: true,
  targetRoles: [],
};

function toggleRole(current: TargetRole[], role: TargetRole) {
  return current.includes(role)
    ? current.filter((item) => item !== role)
    : [...current, role];
}

function targetSummary(targetRoles?: TargetRole[]) {
  if (!targetRoles || targetRoles.length === 0) return "Todos";
  return ROLE_OPTIONS
    .filter((role) => targetRoles.includes(role.value))
    .map((role) => role.label)
    .join(", ");
}

function AudienceSelector({
  value,
  onChange,
}: {
  value: TargetRole[];
  onChange: (roles: TargetRole[]) => void;
}) {
  const allSelected = value.length === 0;

  return (
    <div className="space-y-2">
      <label className="block text-xs text-gray-400">Público-alvo</label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange([])}
          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
            allSelected
              ? "border-emerald-500 bg-emerald-500/15 text-emerald-200"
              : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
          }`}
        >
          Todos
        </button>
        {ROLE_OPTIONS.map((role) => (
          <button
            key={role.value}
            type="button"
            onClick={() => onChange(toggleRole(value, role.value))}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              value.includes(role.value)
                ? "border-emerald-500 bg-emerald-500/15 text-emerald-200"
                : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
            }`}
          >
            {role.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        Selecione “Todos” para manter o comunicado visível a qualquer usuário autenticado.
      </p>
    </div>
  );
}

export default function ComunicadosAdminPage() {
  const { session } = useAuth();
  const { data: comunicados, loading, error, reload } = useConvexQuery<Announcement[]>("announcements:getAllAnnouncements");

  const [form, setForm] = useState<AnnouncementForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AnnouncementForm>(emptyForm);
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
        targetRoles: form.targetRoles,
        sessionToken: session.token,
      });
      setMsg({ type: "ok", text: "Comunicado publicado com sucesso!" });
      setForm(emptyForm);
      reload();
    } catch (err: unknown) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Erro ao criar" });
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(announcement: Announcement) {
    setEditingId(announcement._id);
    setEditForm({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      active: announcement.active,
      targetRoles: announcement.targetRoles ?? [],
    });
    setMsg(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyForm);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !editingId || !editForm.title || !editForm.content) {
      setMsg({ type: "err", text: "Título e conteúdo são obrigatórios." });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      await convexMutation("announcements:updateAnnouncement", {
        id: editingId,
        title: editForm.title,
        content: editForm.content,
        type: editForm.type,
        active: editForm.active,
        targetRoles: editForm.targetRoles,
        sessionToken: session.token,
      });
      setMsg({ type: "ok", text: "Comunicado atualizado com sucesso!" });
      cancelEdit();
      reload();
    } catch (err: unknown) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Erro ao atualizar" });
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
        <p className="text-sm text-gray-400 mt-1">
          Publicar, segmentar e gerenciar avisos para públicos específicos do residencial.
        </p>
      </div>

      <form onSubmit={handleCreate} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-medium text-gray-300">Novo Comunicado</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
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
              onChange={(e) => setForm({ ...form, type: e.target.value as AnnouncementType })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              {TYPES.map((type) => <option key={type} value={type}>{TYPE_LABEL[type]}</option>)}
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

          <div className="md:col-span-2">
            <AudienceSelector
              value={form.targetRoles}
              onChange={(targetRoles) => setForm({ ...form, targetRoles })}
            />
          </div>

          <div className="md:col-span-2">
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
              {editingId === c._id ? (
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-400 mb-1">Título</label>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Tipo</label>
                      <select
                        value={editForm.type}
                        onChange={(e) => setEditForm({ ...editForm, type: e.target.value as AnnouncementType })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                      >
                        {TYPES.map((type) => <option key={type} value={type}>{TYPE_LABEL[type]}</option>)}
                      </select>
                    </div>

                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.active}
                          onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-emerald-500"
                        />
                        <span className="text-sm text-gray-300">Ativo</span>
                      </label>
                    </div>

                    <div className="md:col-span-2">
                      <AudienceSelector
                        value={editForm.targetRoles}
                        onChange={(targetRoles) => setEditForm({ ...editForm, targetRoles })}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-400 mb-1">Conteúdo</label>
                      <textarea
                        value={editForm.content}
                        onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                        rows={4}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      {submitting ? "Salvando…" : "Salvar alterações"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[c.type]}`}>{TYPE_LABEL[c.type]}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-900/30 text-emerald-300">
                        Público: {targetSummary(c.targetRoles)}
                      </span>
                      {!c.active && <span className="px-2 py-0.5 rounded-full text-xs bg-gray-800 text-gray-400">Inativo</span>}
                      <span className="text-xs text-gray-500">{formatTimestamp(c.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        onClick={() => startEdit(c)}
                        className="text-gray-400 hover:text-emerald-300 text-xs transition-colors"
                        title="Editar comunicado"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(c._id)}
                        className="text-gray-500 hover:text-red-400 text-xs transition-colors"
                        title="Inativar comunicado"
                      >
                        Inativar
                      </button>
                    </div>
                  </div>
                  <h4 className="text-white font-medium mt-2">{c.title}</h4>
                  <p className="text-gray-400 text-sm mt-1 line-clamp-2">{c.content}</p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
