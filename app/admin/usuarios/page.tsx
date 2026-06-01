/*
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
  associateId?: string;
  parentAssociateId?: string;
};

type Associate = {
  _id: string;
  name: string;
  unit?: string;
  cpfPrefix?: string;
  status: "ativo" | "inativo" | "inadimplente";
};

type UserFormState = {
  name: string;
  email: string;
  password: string;
  role: User["role"];
  unit: string;
  residenceAssociateId: string;
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

const emptyForm = (role: User["role"] = "associado"): UserFormState => ({
  name: "",
  email: "",
  password: "",
  role,
  unit: "",
  residenceAssociateId: "",
});

function formatAssociateOption(associate: Associate) {
  const parts = [associate.unit ? `Unidade ${associate.unit}` : "Sem unidade", associate.name];
  if (associate.cpfPrefix) parts.push(`CPF ${associate.cpfPrefix}…`);
  if (associate.status !== "ativo") parts.push(associate.status);
  return parts.join(" — ");
}

function residenceLabel(role: User["role"]) {
  if (role === "associado") return "Associado financeiro vinculado";
  if (role === "morador") return "Titular financeiro da unidade";
  return "Unidade administrativa/informativa";
}

function usesFinancialLink(role: User["role"]) {
  return role === "associado" || role === "morador";
}

function requiresManualPassword(role: User["role"]) {
  return role === "sysadmin" || role === "diretoria";
}

function buildResidencePayload(form: UserFormState) {
  const unit = form.unit.trim() || undefined;
  if (form.role === "associado") {
    return {
      unit,
      associateId: form.residenceAssociateId || undefined,
    };
  }
  if (form.role === "morador") {
    return {
      unit,
      parentAssociateId: form.residenceAssociateId || undefined,
    };
  }
  return { unit };
}

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

  // Cadastro financeiro/titular usado como origem operacional das unidades.
  const { data: associates } = useConvexQuery<Associate[]>("associates:getAllAssociates");

  const [form, setForm] = useState<UserFormState>(emptyForm("associado"));
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UserFormState>(emptyForm("associado"));
  const [savingEdit, setSavingEdit] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"todos" | User["role"]>("todos");
  const [statusFilter, setStatusFilter] = useState<"todos" | User["status"]>("todos");

  const canManageUsers = session?.role === "sysadmin" || session?.role === "diretoria";
  const canEditUsers = session?.role === "sysadmin";
  const roleOptions = session?.role === "sysadmin" ? SYSTEM_ADMIN_ROLES : MANAGEMENT_ROLES;

  const associateById = useMemo(() => {
    const map = new Map<string, Associate>();
    (associates ?? []).forEach((associate) => map.set(associate._id, associate));
    return map;
  }, [associates]);

  const unitOptions = useMemo(() => {
    const units = new Set<string>();
    (associates ?? []).forEach((associate) => {
      if (associate.unit?.trim()) units.add(associate.unit.trim().toUpperCase());
    });
    (users ?? []).forEach((user) => {
      if (user.unit?.trim()) units.add(user.unit.trim().toUpperCase());
    });
    return Array.from(units).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  }, [associates, users]);

  const activeAssociates = useMemo(
    () => (associates ?? []).filter((associate) => associate.status === "ativo"),
    [associates]
  );

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (users ?? []).filter((user) => {
      const linkedAssociate = associateById.get(user.associateId ?? user.parentAssociateId ?? "");
      const matchesSearch =
        !term ||
        user.name.toLowerCase().includes(term) ||
        (user.email ?? "").toLowerCase().includes(term) ||
        (user.unit ?? "").toLowerCase().includes(term) ||
        (linkedAssociate?.name ?? "").toLowerCase().includes(term) ||
        (linkedAssociate?.cpfPrefix ?? "").toLowerCase().includes(term);
      const matchesRole = roleFilter === "todos" || user.role === roleFilter;
      const matchesStatus = statusFilter === "todos" || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter, associateById]);

  if (!session) return null;
  if (!canManageUsers) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-4xl mb-3">🔒</p>
        <p className="text-lg">Acesso restrito à Diretoria ou Sysadmin</p>
      </div>
    );
  }

  function syncUnitFromAssociate(value: string, currentForm: UserFormState) {
    const associate = associateById.get(value);
    return {
      ...currentForm,
      residenceAssociateId: value,
      unit: associate?.unit?.trim() ? associate.unit.trim().toUpperCase() : currentForm.unit,
    };
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !form.name.trim() || !form.email.trim()) {
      setMsg({ type: "err", text: "Nome e e-mail são obrigatórios." });
      return;
    }
    if (requiresManualPassword(form.role) && !form.password.trim()) {
      setMsg({ type: "err", text: "Senha é obrigatória para Sysadmin e Diretoria." });
      return;
    }
    if (usesFinancialLink(form.role) && !form.residenceAssociateId) {
      setMsg({ type: "err", text: "Selecione o cadastro financeiro vinculado antes de criar Associado ou Morador." });
      return;
    }
    if (!roleOptions.includes(form.role)) {
      setMsg({ type: "err", text: "Seu perfil não pode cadastrar usuários com este papel." });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      const passwordHash = form.password.trim() ? await sha256(form.password) : undefined;
      await convexMutation("users:createUser", {
        sessionToken: session.token,
        name: form.name.trim(),
        email: form.email.trim(),
        passwordHash,
        role: form.role,
        ...buildResidencePayload(form),
      });
      setMsg({ type: "ok", text: usesFinancialLink(form.role) && !passwordHash ? "Usuário criado com sucesso. A senha inicial é o CPF completo do titular, somente números." : "Usuário criado com sucesso!" });
      setForm(emptyForm(roleOptions[0] ?? "associado"));
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
      residenceAssociateId: user.associateId ?? user.parentAssociateId ?? "",
    });
    setMsg(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyForm("associado"));
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
        associateId?: string;
        parentAssociateId?: string;
      } = {
        sessionToken: session.token,
        id: editingId,
        name: editForm.name.trim(),
        email: editForm.email.trim() || undefined,
        role: editForm.role,
        ...buildResidencePayload(editForm),
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

  const renderResidenceFields = (
    state: UserFormState,
    onChange: (next: UserFormState) => void,
    accent: "emerald" | "blue"
  ) => {
    const hasFinancialLink = usesFinancialLink(state.role);
    const borderClass = accent === "blue" ? "focus:border-blue-500" : "focus:border-emerald-500";

    return (
      <>
        {hasFinancialLink && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">{residenceLabel(state.role)}</label>
            <select
              value={state.residenceAssociateId}
              onChange={(e) => onChange(syncUnitFromAssociate(e.target.value, state))}
              className={`w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none ${borderClass}`}
            >
              <option value="">Selecionar pelo cadastro financeiro</option>
              {activeAssociates.map((associate) => (
                <option key={associate._id} value={associate._id}>{formatAssociateOption(associate)}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
              O vínculo garante que CPF, unidade e futura conciliação de pagamentos apontem para o titular financeiro correto.
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs text-gray-400 mb-1">
            {hasFinancialLink ? "Unidade derivada ou informada" : residenceLabel(state.role)}
          </label>
          <input
            type="text"
            list="unit-options"
            value={state.unit}
            onChange={(e) => onChange({ ...state, unit: e.target.value })}
            placeholder="Ex: CASA 12, APTO 203, A1…"
            className={`w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none ${borderClass}`}
          />
          <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
            A inadimplência deve ser acompanhada por unidade; CPF e nomes de pagadores ficam como filtros complementares.
          </p>
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <datalist id="unit-options">
        {unitOptions.map((unit) => <option key={unit} value={unit} />)}
      </datalist>

      <div>
        <h2 className="text-xl font-bold text-white">Usuários do Sistema</h2>
        <p className="text-sm text-gray-400 mt-1">
          Cadastre usuários vinculando a unidade operacional e, quando aplicável, o associado financeiro/titular.
          {session.role === "sysadmin" && typeof sysCount === "number" && (
            <span className={`ml-2 ${sysCount >= 2 ? "text-yellow-400" : "text-gray-400"}`}>
              {sysCount}/2 sysadmins ativos
            </span>
          )}
        </p>
      </div>

      <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-4 text-sm text-emerald-100">
        <p className="font-medium">Regra operacional recomendada</p>
        <p className="mt-1 text-xs leading-relaxed text-emerald-200/80">
          Use a <strong>Unidade</strong> para verificar inadimplência e agrupar moradores. Use o <strong>CPF</strong> e o cadastro financeiro para autenticação, rastreabilidade e futura conciliação de pagadores alternativos.
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
                          <label className="block text-xs text-gray-400 mb-1">Senha{usesFinancialLink(form.role) ? " (opcional)" : ""}</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={usesFinancialLink(form.role) ? "Em branco: CPF completo do titular" : "Senha do usuário"}
                required={requiresManualPassword(form.role)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
              {usesFinancialLink(form.role) && (
                <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                  Com vínculo financeiro selecionado, deixar em branco define a senha inicial como CPF completo do titular, somente números.
                </p>
              )}

          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Papel</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as User["role"], residenceAssociateId: e.target.value === "associado" || e.target.value === "morador" ? form.residenceAssociateId : "" })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500">
              {roleOptions.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </div>

          {renderResidenceFields(form, setForm, "emerald")}
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
              <p className="text-xs text-blue-300/80 mt-1">Somente Sysadmin pode editar cadastro, papel, vínculo de unidade e senha de usuários.</p>
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
              <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as User["role"], residenceAssociateId: e.target.value === "associado" || e.target.value === "morador" ? editForm.residenceAssociateId : "" })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                {SYSTEM_ADMIN_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </div>
            {renderResidenceFields(editForm, setEditForm, "blue")}
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
              placeholder="Buscar por nome, e-mail, unidade, titular ou CPF parcial"
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
            <table className="w-full text-sm min-w-[920px]">
              <thead className="bg-gray-800/50">
                <tr className="text-gray-400 text-xs uppercase">
                  {["Nome", "E-mail", "Papel", "Unidade", "Vínculo financeiro", "Status", "Ações"].map((h) => (
                    <th key={h} className="text-left px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">Nenhum usuário encontrado.</td></tr>
                ) : filteredUsers.map((u) => {
                  const linkedAssociate = associateById.get(u.associateId ?? u.parentAssociateId ?? "");
                  const linkKind = u.associateId ? "Titular" : u.parentAssociateId ? "Morador da unidade" : "Sem vínculo";
                  return (
                    <tr key={u._id} className="border-t border-gray-800/50 hover:bg-gray-800/20">
                      <td className="px-4 py-3 text-white">{u.name}</td>
                      <td className="px-4 py-3 text-gray-400">{u.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[u.role]}`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-200 font-medium">{u.unit ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-400">
                        <div className="max-w-[220px]">
                          <p className="text-xs text-gray-300">{linkKind}</p>
                          <p className="truncate text-xs text-gray-500">{linkedAssociate ? `${linkedAssociate.name}${linkedAssociate.cpfPrefix ? ` · CPF ${linkedAssociate.cpfPrefix}…` : ""}` : "—"}</p>
                        </div>
                      </td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
