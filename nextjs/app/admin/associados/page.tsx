/**
 * admin/associados/page.tsx — Gestão de Associados
 * Lista, busca e atualiza o status dos associados.
 */
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useConvexQuery, convexMutation } from "@/lib/convex";

type Associate = {
  _id: string;
  name: string;
  unit: string;
  status: "ativo" | "inativo" | "inadimplente";
  cpfPrefix?: string;
  email?: string;
  phone?: string;
  joinedAt?: string;
};

// Badge de status
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ativo:        "bg-emerald-900/50 text-emerald-300",
    inativo:      "bg-gray-800 text-gray-400",
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
  const [updating, setUpdating] = useState<string | null>(null); // _id sendo atualizado
  const [msg, setMsg] = useState<string | null>(null);

  if (!session) return null;

  // Filtrar pelo campo de busca (nome, unidade ou CPF prefix)
  const filtered = (associados ?? []).filter((a) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      a.name.toLowerCase().includes(term) ||
      a.unit.toLowerCase().includes(term) ||
      (a.cpfPrefix && a.cpfPrefix.includes(term))
    );
  });

  // Atualizar status do associado
  async function updateStatus(id: string, status: Associate["status"]) {
    if (!session) return;
    setUpdating(id);
    setMsg(null);
    try {
      await convexMutation("associates:updateAssociateStatus", {
        id,
        status,
        sessionToken: session.token,
      });
      setMsg(`Status atualizado para "${status}"`);
      reload();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Erro ao atualizar");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-4">

      <div>
        <h2 className="text-xl font-bold text-white">Associados</h2>
        <p className="text-sm text-gray-400 mt-1">
          {associados?.length ?? 0} associado(s) cadastrado(s)
        </p>
      </div>

      {/* Busca */}
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

      {/* Tabela */}
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
                    <td className="px-4 py-3 text-white font-medium">{a.unit}</td>
                    <td className="px-4 py-3 text-gray-300">{a.name}</td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {a.email && <div>{a.email}</div>}
                      {a.phone && <div>{a.phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {a.status !== "ativo" && (
                          <button
                            onClick={() => updateStatus(a._id, "ativo")}
                            disabled={updating === a._id}
                            className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs rounded transition-colors"
                          >
                            Ativar
                          </button>
                        )}
                        {a.status === "ativo" && (
                          <button
                            onClick={() => updateStatus(a._id, "inadimplente")}
                            disabled={updating === a._id}
                            className="px-2 py-1 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50 text-white text-xs rounded transition-colors"
                          >
                            Inadimplente
                          </button>
                        )}
                        {a.status !== "inativo" && (
                          <button
                            onClick={() => updateStatus(a._id, "inativo")}
                            disabled={updating === a._id}
                            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-xs rounded transition-colors"
                          >
                            Inativar
                          </button>
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
