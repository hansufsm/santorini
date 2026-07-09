/*
 * admin/usuarios/page.tsx — Gestão de Usuários
 * Apenas Sysadmin pode consultar e cadastrar usuários.
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
  email?: string;
  phone?: string;
};

type UserFormState = {
  name: string;
  email: string;
  password: string;
  role: User["role"];
  unit: string;
  residenceAssociateId: string;
  cpf: string;
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
  cpf: "",
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

function normalizeLookupText(text?: string) {
  return (text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function normalizeUnitValue(unit?: string) {
  return unit?.trim().replace(/\s+/g, " ").toUpperCase() || "";
}

function normalizeCpfDigits(cpf?: string) {
  return cpf?.replace(/\D/g, "") || "";
}

function buildResidencePayload(form: UserFormState, includeMaterializationData = false) {
  const unit = form.unit.trim() || undefined;
  if (form.role === "associado") {
    return {
      unit,
      associateId: form.residenceAssociateId || undefined,
      ...(includeMaterializationData && !form.residenceAssociateId ? { cpf: normalizeCpfDigits(form.cpf) || undefined } : {}),
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
    !session || session.role !== "sysadmin"
  );

  // Cadastro financeiro/titular usado como origem operacional das unidades.
  const { data: associates } = useConvexQuery<Associate[]>(
    "associates:getAllAssociates",
    {},
    !session || session.role !== "sysadmin"
  );

  const [form, setForm] = useState<UserFormState>(emptyForm("associado"));
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UserFormState>(emptyForm("associado"));
  const [savingEdit, setSavingEdit] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"todos" | User["role"]>("todos");
  const [statusFilter, setStatusFilter] = useState<"todos" | User["status"]>("todos");

  const canManageUsers = session?.role === "sysadmin";
  const canEditUsers = session?.role === "sysadmin";
  const roleOptions = SYSTEM_ADMIN_ROLES;

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

  const associatesWithoutAccount = useMemo(() => {
    if (!associates || !users) return [];
    const linkedAssociateIds = new Set<string>();
    users.forEach((u) => {
      if (u.associateId) linkedAssociateIds.add(u.associateId);
    });
    return (associates ?? []).filter(
      (assoc) => assoc.status === "ativo" && !linkedAssociateIds.has(assoc._id)
    );
  }, [associates, users]);

  const findSuggestedAssociate = (state: UserFormState) => {
    if (!usesFinancialLink(state.role)) return undefined;

    const normalizedName = normalizeLookupText(state.name);
    if (normalizedName) {
      const nameMatches = activeAssociates.filter(
        (associate) => normalizeLookupText(associate.name) === normalizedName
      );
      if (nameMatches.length === 1) return nameMatches[0];
    }

    const normalizedUnit = normalizeUnitValue(state.unit);
    if (normalizedUnit) {
      const unitMatches = activeAssociates.filter(
        (associate) => normalizeUnitValue(associate.unit) === normalizedUnit
      );
      if (unitMatches.length === 1) return unitMatches[0];
    }

    return undefined;
  };

  const applyAutomaticFinancialLink = (state: UserFormState, allowOverride = false) => {
    if (!usesFinancialLink(state.role)) {
      return { ...state, residenceAssociateId: "" };
    }
    if (state.residenceAssociateId && !allowOverride) return state;

    const suggestedAssociate = findSuggestedAssociate(state);
    if (!suggestedAssociate) return state;

    return {
      ...state,
      residenceAssociateId: suggestedAssociate._id,
      unit: suggestedAssociate.unit?.trim() ? suggestedAssociate.unit.trim().toUpperCase() : state.unit,
    };
  };

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
        <p className="text-lg">Acesso restrito ao Sysadmin</p>
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
    const createForm = applyAutomaticFinancialLink(form);
    if (createForm.role === "morador" && !createForm.residenceAssociateId) {
      setMsg({ type: "err", text: "Não foi possível identificar automaticamente o titular financeiro. Selecione o vínculo antes de criar Morador." });
      return;
    }
    if (createForm.role === "associado" && !createForm.residenceAssociateId && normalizeCpfDigits(createForm.cpf).length !== 11) {
      setMsg({ type: "err", text: "Para criar Associado sem cadastro financeiro existente, informe o CPF completo. O sistema criará o registro em Associados automaticamente." });
      return;
    }
    if (!roleOptions.includes(createForm.role)) {
      setMsg({ type: "err", text: "Seu perfil não pode cadastrar usuários com este papel." });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      const passwordHash = createForm.password.trim() ? await sha256(createForm.password) : undefined;
      await convexMutation("users:createUser", {
        sessionToken: session.token,
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        passwordHash,
        role: createForm.role,
        ...buildResidencePayload(createForm, true),
      });
      setMsg({ type: "ok", text: usesFinancialLink(createForm.role) && !passwordHash ? "Usuário criado com sucesso. O vínculo financeiro foi aplicado ou criado automaticamente, e a senha inicial é o CPF completo do titular, somente números." : "Usuário criado com sucesso!" });
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
      cpf: "",
    });
    setMsg(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyForm("associado"));
    setSavingEdit(false);
  }

  function fillFormFromAssociate(associate: Associate) {
    setForm({
      name: associate.name,
      email: associate.email ?? "",
      password: "",
      role: "associado",
      unit: associate.unit ?? "",
      residenceAssociateId: associate._id,
      cpf: "",
    });
    setMsg(null);
    const formElement = document.getElementById("new-user-form");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth" });
    }
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
    const nextEditForm = applyAutomaticFinancialLink(editForm);
    if (usesFinancialLink(nextEditForm.role) && !nextEditForm.residenceAssociateId) {
      setMsg({ type: "err", text: "Não foi possível identificar automaticamente o cadastro financeiro. Selecione o vínculo antes de salvar." });
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
        name: nextEditForm.name.trim(),
        email: nextEditForm.email.trim() || undefined,
        role: nextEditForm.role,
        ...buildResidencePayload(nextEditForm),
      };

      if (nextEditForm.password.trim()) {
        payload.passwordHash = await sha256(nextEditForm.password);
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
    accent: "emerald" | "blue",
    allowAssociateMaterialization = false
  ) => {
    const hasFinancialLink = usesFinancialLink(state.role);
    const borderClass = accent === "blue" ? "focus:border-blue-500" : "focus:border-emerald-500";
    const suggestedAssociate = findSuggestedAssociate(state);
    const selectedAssociate = associateById.get(state.residenceAssociateId);
    const canApplySuggestion = hasFinancialLink && suggestedAssociate && suggestedAssociate._id !== state.residenceAssociateId;

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
            <div className="mt-2 rounded-lg border border-gray-800 bg-gray-950/40 px-3 py-2 text-[11px] leading-relaxed text-gray-400">
              {selectedAssociate ? (
                <p>
                  Vínculo atual: <strong className="text-gray-200">{selectedAssociate.name}</strong>
                  {selectedAssociate.cpfPrefix ? ` · CPF ${selectedAssociate.cpfPrefix}…` : ""}
                  {selectedAssociate.unit ? ` · Unidade ${selectedAssociate.unit}` : ""}.
                </p>
              ) : suggestedAssociate ? (
                <p>
                  Sugestão automática: <strong className="text-gray-200">{suggestedAssociate.name}</strong>
                  {suggestedAssociate.cpfPrefix ? ` · CPF ${suggestedAssociate.cpfPrefix}…` : ""}
                  {suggestedAssociate.unit ? ` · Unidade ${suggestedAssociate.unit}` : ""}.
                </p>
              ) : (
                <p>
                  {state.role === "associado" && allowAssociateMaterialization
                    ? "Nenhum vínculo seguro identificado automaticamente. O sysadmin pode selecionar um cadastro existente ou informar CPF completo para criar o associado financeiro junto com o usuário."
                    : "Nenhum vínculo seguro identificado automaticamente. O sysadmin deve selecionar manualmente."}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {canApplySuggestion && (
                  <button
                    type="button"
                    onClick={() => onChange(applyAutomaticFinancialLink(state, true))}
                    className="rounded bg-emerald-700 px-2 py-1 text-[11px] font-medium text-white hover:bg-emerald-600"
                  >
                    Aplicar vínculo sugerido
                  </button>
                )}
                {state.residenceAssociateId && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...state, residenceAssociateId: "" })}
                    className="rounded bg-gray-800 px-2 py-1 text-[11px] font-medium text-gray-200 hover:bg-gray-700"
                  >
                    Alterar manualmente
                  </button>
                )}
              </div>
              <p className="mt-2 text-gray-500">
                {allowAssociateMaterialization
                  ? "O vínculo garante que CPF, unidade e rastreabilidade apontem para o titular financeiro correto. Para novo Associado sem vínculo existente, o CPF abaixo materializa o registro financeiro automaticamente."
                  : "O vínculo garante que CPF, unidade e rastreabilidade apontem para o titular financeiro correto."}
              </p>
            </div>
          </div>
        )}

        {allowAssociateMaterialization && state.role === "associado" && !state.residenceAssociateId && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">CPF do associado financeiro</label>
            <input
              type="text"
              inputMode="numeric"
              value={state.cpf}
              onChange={(e) => onChange({ ...state, cpf: e.target.value })}
              placeholder="Somente números ou CPF formatado"
              className={`w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none ${borderClass}`}
            />
            <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
              Obrigatório quando não há cadastro financeiro selecionado. O backend usa este CPF para criar a linha em Associados e definir a senha inicial.
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs text-gray-400 mb-1">
            {hasFinancialLink ? "Unidade (Número da casa/lote)" : `${residenceLabel(state.role)} (Número da casa/lote)`}
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
          Cadastre usuários vinculando a unidade operacional e, quando aplicável, o associado financeiro/titular. Para novo Associado sem cadastro financeiro, informe CPF para criar o registro em Associados automaticamente.
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
          Use a <strong>Unidade</strong> para verificar inadimplência e agrupar moradores. Use o <strong>CPF</strong> e o cadastro financeiro para autenticação, rastreabilidade e futura conciliação de pagadores alternativos. Ao criar um novo <strong>Associado</strong> sem vínculo existente, o sistema materializa automaticamente a linha em Associados.
        </p>
      </div>

      {/* Associados sem conta de acesso */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <span>👥 Associados Financeiros sem Conta de Acesso</span>
            {associatesWithoutAccount.length > 0 && (
              <span className="bg-emerald-900/50 text-emerald-300 text-xs px-2 py-0.5 rounded-full font-bold">
                {associatesWithoutAccount.length} pendente(s)
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Lista de proprietários/titulares com cota ativa que ainda não têm um usuário associado no sistema.
          </p>
        </div>

        {associatesWithoutAccount.length === 0 ? (
          <div className="text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 rounded-lg px-4 py-3">
            🎉 Todos os associados financeiros ativos já possuem conta de acesso no sistema!
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto border border-gray-800 rounded-lg divide-y divide-gray-800">
            {associatesWithoutAccount.map((assoc) => (
              <div key={assoc._id} className="flex items-center justify-between p-3 text-xs hover:bg-gray-800/10 transition">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-200 truncate">{assoc.name}</p>
                  <p className="text-gray-500 mt-0.5">
                    {assoc.unit ? `Unidade ${assoc.unit}` : "Sem unidade"}
                    {assoc.cpfPrefix ? ` · CPF ${assoc.cpfPrefix}…` : ""}
                    {assoc.email ? ` · ${assoc.email}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fillFormFromAssociate(assoc)}
                  className="ml-4 flex-shrink-0 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-lg font-medium border border-emerald-500/20 transition-all text-xs"
                >
                  Configurar acesso
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Formulário de criação */}
      <form id="new-user-form" onSubmit={handleCreate} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-medium text-gray-300">➕ Novo Usuário</h3>

        {form.residenceAssociateId && (
          <div className="text-xs text-amber-300 bg-amber-950/20 border border-amber-800/30 rounded-lg p-3 flex items-start gap-2.5">
            <span className="text-base leading-none">💡</span>
            <div>
              <p className="font-semibold mb-0.5">Formulário preenchido com dados de associado pendente</p>
              <p className="text-gray-400">
                Os dados de <strong>{form.name}</strong> foram copiados. Preencha o e-mail (caso esteja em branco) e clique no botão verde <strong>"Criar Usuário"</strong> ao final do formulário para finalizar a criação da conta.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nome</label>
            <input type="text" value={form.name} onChange={(e) => setForm(applyAutomaticFinancialLink({ ...form, name: e.target.value }))}
              onBlur={() => setForm(applyAutomaticFinancialLink(form))}
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
            <select value={form.role} onChange={(e) => setForm(applyAutomaticFinancialLink({ ...form, role: e.target.value as User["role"], residenceAssociateId: e.target.value === "associado" || e.target.value === "morador" ? form.residenceAssociateId : "" }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500">
              {roleOptions.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </div>

          {renderResidenceFields(form, setForm, "emerald", true)}
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
              <input type="text" value={editForm.name} onChange={(e) => setEditForm(applyAutomaticFinancialLink({ ...editForm, name: e.target.value }))}
                onBlur={() => setEditForm(applyAutomaticFinancialLink(editForm))}
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
              <select value={editForm.role} onChange={(e) => setEditForm(applyAutomaticFinancialLink({ ...editForm, role: e.target.value as User["role"], residenceAssociateId: e.target.value === "associado" || e.target.value === "morador" ? editForm.residenceAssociateId : "" }))}
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
