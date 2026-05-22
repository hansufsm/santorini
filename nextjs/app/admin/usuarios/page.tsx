/**
 * admin/usuarios/page.tsx — Gestão de Usuários (Sysadmin apenas)
 * Criar, inativar e reativar usuários do sistema.
 */
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useConvexQuery, convexMutation } from "@/lib/convex";

type User = {
  _id: string;
  name: string;
  email?: string;
  role: "sysadmin" | "diretoria" | "associado" | "morador";
  status: "ativo" | "inativo";
  unit?: string;
};

const ROLE_BADGE: Record<string, string> = {
  sysadmin:  "bg-purple-900/50 text-purple-300",
  diretoria: "bg-blue-900/50 text-blue-300",
  associado: "bg-emerald-900/50 text-emerald-300",
  morador:   "bg-gray-800 text-gray-300",
};

// Gera hash SHA-256 da senha no navegador (nunca enviar a senha em texto)
async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const ROLES = ["sysadmin", "diretoria", "associado", "morador"];

export default function UsuariosPage() {
  const { session } = useAuth();

  // Contagem de sysadmins (consulta pública, sem token)
  const { data: sysCount } = useConvexQuery<number>("users:getSysadminCount");

  // Lista de usuários (requer token)
  const { data: users, loading, error, reload } = useConvexQuery<User[]>(
    "users:getAllUsers",
    { sessionToken: session?.token ?? "" },
    !session
  );

  const [form, setForm] = useState({ name: "", email: "", password: "", role: "diretoria", unit: "" });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Apenas sysadmin pode acessar esta página
  if (!session) return null;
  if (session.role !== "sysadmin") {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-4xl mb-3">🔒</p>
        <p className="text-lg">Acesso restrito a Sysadmin</p>
      </div>
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !form.name || !form.email || !form.password) {
      setMsg({ type: "err", text: "Nome, e-mail e senha são obrigatórios." });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      const passwordHash = await sha256(form.password);
      await convexMutation("users:createUser", {
        sessionToken: session.token,
        name: form.name,
        email: form.email,
        passwordHash,
        role: form.role,
        unit: form.unit || undefined,
      });
      setMsg({ type: "ok", text: "Usuário criado com sucesso!" });
      setForm({ name: "", email: "", password: "", role: "diretoria", unit: "" });
      reload();
    } catch (err: unknown) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Erro ao criar usuário" });
    } finally {
      setSubmitting(false);
    }
  }

  async function deactivate(id: string) {
    if (!session || !confirm("Inativar este usuário?")) return;
    await convexMutation("users:deactivateUser", { sessionToken: session.token, id });
    reload();
  }

  async function reactivate(id: string) {
    if (!session) return;
    await convexMutation("users:reactivateUser", { sessionToken: session.token, id });
    reload();
  }

  return (
    <div className="space-y-6">

      <div>
        <h2 className="text-xl font-bold text-white">Usuários do Sistema</h2>
        <p className="text-sm text-gray-400 mt-1">
          {typeof sysCount === "number" && (
            <span className={sysCount >= 2 ? "text-yellow-400" : "text-gray-400"}>
              {sysCount}/2 sysadmins ativos
            </span>
          )}
        </p>
      </div>

      {/* Formulário de criação */}
      <form onSubmit={handleCreate} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-medium text-gray-300">➕ Novo Usuário</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nome</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome completo"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">E-mail</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@exemplo.com"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Senha</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Senha do usuário"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Papel</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500">
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Unidade (opcional)</label>
            <input type="text" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="Ex: A1, B3…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        {/* Alerta quando limite de sysadmins for atingido */}
        {typeof sysCount === "number" && sysCount >= 2 && form.role === "sysadmin" && (
          <p className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-700 rounded-lg px-3 py-2">
            ⚠️ Limite de 2 sysadmins ativos atingido — não é possível criar mais.
          </p>
        )}

        {msg && (
          <p className={`text-sm px-3 py-2 rounded-lg ${msg.type === "ok" ? "bg-emerald-900/40 text-emerald-300" : "bg-red-900/40 text-red-300"}`}>
            {msg.text}
          </p>
        )}

        <button type="submit" disabled={submitting}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors">
          {submitting ? "Criando…" : "Criar Usuário"}
        </button>
      </form>

      {/* Lista de usuários */}
      {loading ? (
        <div className="text-gray-400 text-center py-8">Carregando…</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50">
                <tr className="text-gray-400 text-xs uppercase">
                  {["Nome", "E-mail", "Papel", "Unidade", "Status", "Ações"].map((h) => (
                    <th key={h} className="text-left px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(!users || users.length === 0) ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Nenhum usuário.</td></tr>
                ) : users.map((u) => (
                  <tr key={u._id} className="border-t border-gray-800/50 hover:bg-gray-800/20">
                    <td className="px-4 py-3 text-white">{u.name}</td>
                    <td className="px-4 py-3 text-gray-400">{u.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[u.role]}`}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{u.unit ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${u.status === "ativo" ? "bg-emerald-900/50 text-emerald-300" : "bg-gray-800 text-gray-400"}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {/* Não permite inativar a si mesmo */}
                      {u._id !== session._id && (
                        u.status === "ativo" ? (
                          <button onClick={() => deactivate(u._id)}
                            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors">
                            Inativar
                          </button>
                        ) : (
                          <button onClick={() => reactivate(u._id)}
                            className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-xs rounded transition-colors">
                            Reativar
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
