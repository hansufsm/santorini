/**
 * admin/associados/page.tsx — Gestão de Associados
 * Lista, busca, edita dados cadastrais e gerencia nomes alternativos de pagamento.
 */
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useConvexQuery, convexMutation } from "@/lib/convex";

type AssociateStatus = "ativo" | "inativo" | "inadimplente";

type Associate = {
  _id: string;
  name: string;
  unit?: string;
  status: AssociateStatus;
  cpf?: string;
  cpfPrefix?: string;
  email?: string;
  phone?: string;
  joinedAt?: string;
  leftAt?: string;
  notes?: string;
  payerNames?: string[];
};

type AssociateForm = {
  name: string;
  unit: string;
  cpf: string;
  cpfPrefix: string;
  email: string;
  phone: string;
  status: AssociateStatus;
  joinedAt: string;
  leftAt: string;
  notes: string;
  // Nomes alternativos de pagamento — armazenados como texto (um por linha)
  payerNamesText: string;
};

const emptyForm: AssociateForm = {
  name: "", unit: "", cpf: "", cpfPrefix: "",
  email: "", phone: "", status: "ativo",
  joinedAt: "", leftAt: "", notes: "", payerNamesText: "",
};

function toForm(associate: Associate): AssociateForm {
  return {
    name: associate.name ?? "",
    unit: associate.unit ?? "",
    cpf: associate.cpf ?? "",
    cpfPrefix: associate.cpfPrefix ?? "",
    email: associate.email ?? "",
    phone: associate.phone ?? "",
    status: associate.status,
    joinedAt: associate.joinedAt ?? "",
    leftAt: associate.leftAt ?? "",
    notes: associate.notes ?? "",
    payerNamesText: (associate.payerNames ?? []).join("\n"),
  };
}

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ativo: "bg-emerald-900/50 text-emerald-300",
    inativo: "bg-gray-800 text-gray-400",
    inadimplente: "bg-yellow-900/50 text-yellow-300",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? "bg-gray-800 text-gray-400"}`}>
      {status}
    </span>
  );
}

export default function AssociadosPage() {
  const { session } = useAuth();
  const { data: associados, loading, error, reload } = useConvexQuery<Associate[]>("associates:getAllAssociates");

  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AssociateForm>(emptyForm);

  if (!session) return null;

  const canEditAssociates = session.role === "diretoria" || session.role === "sysadmin";

  const filtered = (associados ?? []).filter((a) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      a.name.toLowerCase().includes(term) ||
      (a.unit ?? "").toLowerCase().includes(term) ||
      (a.cpfPrefix && a.cpfPrefix.includes(term))
    );
  });

  function startEdit(associate: Associate) {
    setEditingId(associate._id);
    setForm(toForm(associate));
    setMsg(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function updateForm<K extends keyof AssociateForm>(field: K, value: AssociateForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function updateStatus(id: string, status: AssociateStatus) {
    if (!session) return;
    setUpdating(id);
    setMsg(null);
    try {
      await convexMutation("associates:updateAssociateStatus", { id, status, sessionToken: session.token });
      setMsg(`Status atualizado para "${status}"`);
      reload();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Erro ao atualizar");
    } finally {
      setUpdating(null);
    }
  }

  async function saveAssociate() {
    if (!session || !editingId || !canEditAssociates) return;
    if (!form.name.trim()) {
      setMsg("Informe o nome do associado antes de salvar.");
      return;
    }
    setUpdating(editingId);
    setMsg(null);
    try {
      // Converte o texto (um nome por linha) em array, descartando linhas vazias
      const payerNames = form.payerNamesText
        .split("\n")
        .map((n) => n.trim())
        .filter((n) => n.length > 0);

      await convexMutation("associates:updateAssociate", {
        id: editingId,
        sessionToken: session.token,
        name: form.name.trim(),
        unit: optional(form.unit),
        cpf: optional(form.cpf),
        cpfPrefix: optional(form.cpfPrefix),
        phone: optional(form.phone),
        email: optional(form.email),
        status: form.status,
        joinedAt: optional(form.joinedAt),
        leftAt: optional(form.leftAt),
        notes: optional(form.notes),
        payerNames: payerNames.length > 0 ? payerNames : [],
      });
      setMsg("Dados do associado atualizados com sucesso.");
      cancelEdit();
      reload();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Erro ao salvar dados do associado.");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-white">Associados</h2>
        <p className="text-sm text-gray-400 mt-1">
          {associados?.length ?? 0} associado(s) cadastrado(s).
        </p>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nome, unidade ou CPF…"
        className="w-full md:w-96 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
      />

      {msg && (
        <p className="text-sm text-emerald-300 bg-emerald-900/30 border border-emerald-700 rounded-lg px-3 py-2">
          {msg}
        </p>
      )}

      {/* Formulário de edição — aparece acima da tabela quando ativo */}
      {editingId && (
        <div className="rounded-2xl border border-emerald-800/70 bg-gray-900/80 p-4 shadow-xl shadow-black/20">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Editar associado</h3>
              <p className="text-sm text-gray-400">Revise os dados e salve.</p>
            </div>
            <button type="button" onClick={cancelEdit}
              className="rounded-lg border border-gray-700 px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800">
              Cancelar
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="text-gray-300">Nome</span>
              <input value={form.name} onChange={(e) => updateForm("name", e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white outline-none focus:border-emerald-500" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-gray-300">Unidade</span>
              <input value={form.unit} onChange={(e) => updateForm("unit", e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white outline-none focus:border-emerald-500" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-gray-300">Status</span>
              <select value={form.status} onChange={(e) => updateForm("status", e.target.value as AssociateStatus)}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white outline-none focus:border-emerald-500">
                <option value="ativo">Ativo</option>
                <option value="inadimplente">Inadimplente</option>
                <option value="inativo">Inativo</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-gray-300">CPF completo</span>
              <input value={form.cpf} onChange={(e) => updateForm("cpf", e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white outline-none focus:border-emerald-500" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-gray-300">Prefixo do CPF</span>
              <input value={form.cpfPrefix} onChange={(e) => updateForm("cpfPrefix", e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white outline-none focus:border-emerald-500" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-gray-300">Telefone</span>
              <input value={form.phone} onChange={(e) => updateForm("phone", e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white outline-none focus:border-emerald-500" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-gray-300">E-mail</span>
              <input value={form.email} onChange={(e) => updateForm("email", e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white outline-none focus:border-emerald-500" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-gray-300">Entrada</span>
              <input type="date" value={form.joinedAt} onChange={(e) => updateForm("joinedAt", e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white outline-none focus:border-emerald-500" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-gray-300">Saída</span>
              <input type="date" value={form.leftAt} onChange={(e) => updateForm("leftAt", e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white outline-none focus:border-emerald-500" />
            </label>
            <label className="space-y-1 text-sm md:col-span-2 xl:col-span-3">
              <span className="text-gray-300">Observações</span>
              <textarea value={form.notes} onChange={(e) => updateForm("notes", e.target.value)} rows={2}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white outline-none focus:border-emerald-500" />
            </label>

            {/* Campo de nomes alternativos de pagamento */}
            <label className="space-y-1 text-sm md:col-span-2 xl:col-span-3">
              <span className="text-gray-300">Nomes alternativos de pagamento</span>
              <p className="text-xs text-gray-500">
                Um nome por linha. Contribuições identificadas por qualquer desses nomes no extrato
                serão contabilizadas como desta unidade. Ex: cônjuge, empresa, nome abreviado.
              </p>
              <textarea
                value={form.payerNamesText}
                onChange={(e) => updateForm("payerNamesText", e.target.value)}
                rows={3}
                placeholder={"Amilton Silva\nMacpela dos Santos"}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white font-mono text-sm outline-none focus:border-emerald-500 resize-none"
              />
            </label>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={cancelEdit}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800">
              Cancelar
            </button>
            <button type="button" onClick={saveAssociate} disabled={updating === editingId}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50">
              {updating === editingId ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </div>
      )}

      {/* Tabela de associados */}
      {loading ? (
        <div className="text-gray-400 text-center py-8">Carregando…</div>
      ) : error ? (
        <div className="text-red-400 py-4">{error}</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50">
                <tr className="text-gray-400 text-xs uppercase">
                  <th className="text-left px-4 py-3">Unidade</th>
                  <th className="text-left px-4 py-3">Nome</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Contato</th>
                  <th className="text-left px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      Nenhum associado encontrado.
                    </td>
                  </tr>
                ) : filtered.map((a) => (
                  <tr key={a._id} className="border-t border-gray-800/50 hover:bg-gray-800/20">
                    <td className="px-4 py-3 text-white font-medium">{a.unit || "—"}</td>
                    <td className="px-4 py-3 text-gray-300">
                      <div className="font-medium text-gray-200">{a.name}</div>
                      {/* Indica que há nomes alternativos cadastrados */}
                      {a.payerNames && a.payerNames.length > 0 && (
                        <div className="mt-0.5 text-xs text-emerald-600">
                          +{a.payerNames.length} nome(s) alternativo(s)
                        </div>
                      )}
                      {a.cpfPrefix && <div className="mt-0.5 text-xs text-gray-500">CPF: {a.cpfPrefix}…</div>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {a.email && <div>{a.email}</div>}
                      {a.phone && <div>{a.phone}</div>}
                      {!a.email && !a.phone && <div>—</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {canEditAssociates && (
                          <button onClick={() => startEdit(a)} disabled={updating === a._id}
                            className="px-2 py-1 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-xs rounded transition-colors">
                            Editar
                          </button>
                        )}
                        {a.status !== "ativo" && (
                          <button onClick={() => updateStatus(a._id, "ativo")} disabled={updating === a._id}
                            className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs rounded transition-colors">
                            Ativar
                          </button>
                        )}
                        {a.status === "ativo" && (
                          <button onClick={() => updateStatus(a._id, "inadimplente")} disabled={updating === a._id}
                            className="px-2 py-1 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50 text-white text-xs rounded transition-colors">
                            Inadimplente
                          </button>
                        )}
                        {a.status !== "inativo" && (
                          <button onClick={() => updateStatus(a._id, "inativo")} disabled={updating === a._id}
                            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-xs rounded transition-colors">
                            Inativar
                          </button>
                        )}
                      </div>
                    </td>
2
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
