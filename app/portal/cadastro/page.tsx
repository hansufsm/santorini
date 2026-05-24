/**
 * portal/cadastro/page.tsx — Dados cadastrais do associado
 * Permite visualizar dados e atualizar email e telefone (autoatendimento).
 */
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { convexMutation } from "@/lib/convex";

export default function CadastroPage() {
  const { session } = useAuth();

  // Estado do formulário com valores atuais da sessão
  const [email, setEmail] = useState(session?.email ?? "");
  const [phone, setPhone] = useState(session?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  if (!session) return null;

  // Moradores vinculados à unidade podem visualizar o vínculo, mas a edição permanece restrita ao titular financeiro.
  const canEdit = session.role === "associado" && !!session.associateId;
  const isLinkedResident = Boolean(session.parentAssociateId) && !session.associateId;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit || !session) return;

    setSaving(true);
    setMsg(null);

    try {
      await convexMutation("associates:updateAssociateContact", {
        id: session.associateId,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        sessionToken: session.token,
      });
      setMsg({ type: "ok", text: "Dados atualizados com sucesso!" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      setMsg({ type: "err", text: message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-lg">

      <div>
        <h2 className="text-xl font-bold text-white">Meus Dados</h2>
        <p className="text-sm text-gray-400 mt-1">Informações cadastrais da sua conta</p>
      </div>

      {/* Dados fixos (somente leitura) */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Nome</p>
          <p className="text-white font-medium mt-1">{session.name}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Unidade</p>
          <p className="text-white font-medium mt-1">{session.unit}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Perfil</p>
          <p className="text-white font-medium mt-1 capitalize">{session.role}</p>
        </div>
        {isLinkedResident && session.financialResponsibleName && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Titular financeiro da unidade</p>
            <p className="text-white font-medium mt-1">{session.financialResponsibleName}</p>
          </div>
        )}
        {session.cpfPrefix && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">CPF (prefixo)</p>
            <p className="text-white font-medium mt-1">{session.cpfPrefix}***.***-**</p>
          </div>
        )}
        {session.joinedAt && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Associado desde</p>
            <p className="text-white font-medium mt-1">{session.joinedAt}</p>
          </div>
        )}
      </div>

      {/* Formulário de edição ou aviso */}
      {canEdit ? (
        <form onSubmit={handleSave} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-medium text-gray-300">✏️ Atualizar contato</h3>

          <div>
            <label className="block text-xs text-gray-400 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Telefone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(55) 99999-9999"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {msg && (
            <p className={`text-sm px-3 py-2 rounded-lg ${msg.type === "ok" ? "bg-emerald-900/40 text-emerald-300" : "bg-red-900/40 text-red-300"}`}>
              {msg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </form>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center text-gray-400 text-sm">
          {isLinkedResident
            ? "Seu cadastro está vinculado à unidade informada, mas alterações cadastrais e financeiras devem ser solicitadas à diretoria ou ao associado titular."
            : "Para alterar seus dados de contato, entre em contato com a administração."}
        </div>
      )}

    </div>
  );
}
