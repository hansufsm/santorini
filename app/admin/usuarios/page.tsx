/**
 * admin/usuarios/page.tsx — Gestão de Usuários
 * Diretoria e Sysadmin podem consultar e cadastrar usuários conforme suas permissões.
 */
"use client";

import { useMemo, useState } from "react";
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

const ROLE_LABEL: Record<User["role"], string> = {
  sysadmin: "Sysadmin",
  diretoria: "Diretoria",
  associado: "Associado",
  morador: "Morador",
};

const SYSTEM_ADMIN_ROLES: User["role"][] = ["sysadmin", "diretoria", "associado", "morador"];
const MANAGEMENT_ROLES: User["role"][] = ["associado", "morador"];

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

  const [form, setForm] = useState<{ name: string; email: string; password: string; role: User["role"]; unit: string }>({
    name: "",
    email: "",
    password: "",
    role: "associado",
    unit: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; email: string; password: string; role: User["role"]; unit: string }>({
    name: "",
    email: "",
    password: "",
    role: "associado",
    unit: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"todos" | User["role"]>("todos");
  const [statusFilter, setStatusFilter] = useState<"todos" | User["status"]>("todos");

  const canManageUsers = session?.role === "sysadmin" || session?.role === "diretoria";
  const canEditUsers = session?.role === "sysadmin";
  const roleOptions = session?.role === "sysadmin" ? SYSTEM_ADMIN_ROLES : MANAGEMENT_ROLES;

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (users ?? []).filter((user) => {
      const matchesSearch =
        !term ||
        user.name.toLowerCase().includes(term) ||
        (user.email ?? "").toLowerCase().includes(term) ||
        (user.unit ?? "").toLowerCase().includes(term);
      const matchesRole = roleFilter === "todos" || user.role === roleFilter;
      const matchesStatus = statusFilter === "todos" || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  if (!session) return null;
  if (!canManageUsers) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-4xl mb-3">🔒</p>
        <p className="text-lg">Acesso restrito à Diretoria ou Sysadmin</p>
      </div>
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !form.name || !form.email || !form.password) {
      setMsg({ type: "err", text: "Nome, e-mail e senha são obrigatórios." });
      return;
    }
    if (!roleOptions.includes(form.role)) {
      setMsg({ type: "err", text: "Seu perfil não pode cadastrar usuários com este papel." });
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
      setForm({ name: "", email: "", password: "", role: roleOptions[0] ?? "associado", unit: "" });
      reload();
    } catch (err: unknown) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Erro ao criar usuário" });
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(user: User) {
    setEditingId(user._id);
    setEditForm({
      name: user.name,
      email: user.email ?? "",
      password: "",
      role: user.role,
      unit: user.unit ?? "",
    });
    setMsg(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ name: "", email: "", password: "", role: "associado", unit: "" });
    setSavingEdit(false);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !editingId || session.role !== "sysadmin") {
      setMsg({ type: "err", text: "Apenas Sysadmin pode editar usuários." });
      return;
    }
    if (!editForm.name.trim()) {
      setMsg({ type: "err", text: "Nome é obrigatório para editar o usuário." });
      return;
    }
    setSavingEdit(true);
    setMsg(null);
    try {
      const payload: {
        sessionToken: string;
        id: string;
        name: string;
        email?: string;
        passwordHash?: string;
        role: User["role"];
        unit?: string;
      } = {
        sessionToken: session.token,
        id: editingId,
        name: editForm.name.trim(),
        email: editForm.email.trim() || undefined,
        role: editForm.role,
        unit: editForm.unit.trim() || undefined,
      };

      if (editForm.password.trim()) {
        payload.passwordHash = await sha256(editForm.password);
      }

      await convexMutation("users:updateUser", payload);
      setMsg({ type: "ok", text: "Usuário atualizado com sucesso." });
      cancelEdit();
      reload();
    } catch (err: unknown) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Erro ao atualizar usuário" });
    } finally {
      setSavingEdit(false);
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
          Cadastre e consulte usuários conforme as permissões do seu perfil.
          {session.role === "sysadmin" && typeof sysCount === "number" && (
            <span className={`ml-2 ${sysCount >= 2 ? "text-yellow-400" : "text-gray-400"}`}>
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
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as User["role"] })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500">
              {roleOptions.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
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
        {session.role === "sysadmin" && typeof sysCount === "number" && sysCount >= 2 && form.role === "sysadmin" && (
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

      {canEditUsers && editingId && (
        <form onSubmit={handleUpdate} className="bg-blue-950/30 border border-blue-800/70 rounded-xl p-5 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-200">Editar usuário</h3>
              <p className="text-xs text-blue-300/80 mt-1">Somente Sysadmin pode editar cadastro, papel e redefinir senha de usuários.</p>
            </div>
            <button type="button" onClick={cancelEdit} className="text-xs text-gray-300 hover:text-white transition-colors">Cancelar edição</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nome</label>
              <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">E-mail</label>
              <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nova senha (opcional)</label>
              <input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="Preencha apenas se quiser redefinir"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Papel</label>
              <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as User["role"] })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                {SYSTEM_ADMIN_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Unidade (opcional)</label>
              <input type="text" value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          <button type="submit" disabled={savingEdit}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors">
            {savingEdit ? "Salvando…" : "Salvar alterações"}
          </button>
        </form>
      )}

      {/* Consulta de usuários */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">Consultar usuários</label>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, e-mail ou unidade"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Papel</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as "todos" | User["role"])}
              className="w-full sm:w-40 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="todos">Todos</option>
              {SYSTEM_ADMIN_ROLES.map((role) => (
                <option key={role} value={role}>{ROLE_LABEL[role]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "todos" | User["status"])}
              className="w-full sm:w-36 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="todos">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          {filteredUsers.length} de {users?.length ?? 0} usuário(s) visível(is) para o seu perfil.
        </p>
      </section>

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
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Nenhum usuário encontrado.</td></tr>
                ) : filteredUsers.map((u) => (
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
                      <div className="flex flex-wrap gap-2">
                        {canEditUsers && (
                          <button onClick={() => startEdit(u)}
                            className="px-2 py-1 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded transition-colors">
                            Editar
                          </button>
                        )}
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
                      </div>
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
