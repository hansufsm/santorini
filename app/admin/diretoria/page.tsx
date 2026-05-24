"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Search,
  ShieldCheck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { convexMutation, useConvexQuery } from "@/lib/convex";

type ManagedUser = {
  _id: string;
  name: string;
  email?: string;
  role: "diretoria" | "associado";
  status: "ativo" | "inativo";
  unit?: string;
  associateId?: string;
  createdAt?: number;
  updatedAt?: number;
};

type DirectoriaManagementData = {
  members: ManagedUser[];
  candidates: ManagedUser[];
};

type Feedback = { type: "ok" | "err"; text: string } | null;

const SENSITIVE_ACCESS_TEXT =
  "Membros da diretoria têm acesso administrativo completo a dados sensíveis, financeiros e funcionais do sistema.";

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function PersonCard({
  user,
  actionLabel,
  actionTone,
  disabled,
  onAction,
}: {
  user: ManagedUser;
  actionLabel: string;
  actionTone: "promote" | "remove";
  disabled: boolean;
  onAction: () => void;
}) {
  const isPromote = actionTone === "promote";
  const Icon = isPromote ? UserPlus : UserMinus;

  return (
    <article className="rounded-2xl border border-gray-800 bg-gray-950/50 p-4 shadow-lg shadow-black/10 transition-colors hover:border-emerald-700/60">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-white">{user.name}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${user.role === "diretoria" ? "bg-blue-900/50 text-blue-200" : "bg-emerald-900/40 text-emerald-200"}`}>
              {user.role === "diretoria" ? "Diretoria" : "Associado"}
            </span>
            <span className="rounded-full bg-emerald-900/30 px-2 py-0.5 text-xs text-emerald-200">Ativo</span>
          </div>
          <div className="grid gap-1 text-sm text-gray-400">
            <p className="truncate">{user.email ?? "E-mail não informado"}</p>
            <p>Unidade: <span className="text-gray-300">{user.unit ?? "não informada"}</span></p>
          </div>
        </div>

        <button
          type="button"
          onClick={onAction}
          disabled={disabled}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${
            isPromote
              ? "bg-emerald-600 text-white hover:bg-emerald-500"
              : "bg-gray-800 text-gray-100 hover:bg-gray-700"
          }`}
        >
          <Icon className="h-4 w-4" />
          {actionLabel}
        </button>
      </div>
    </article>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-950/30 p-6 text-center">
      <Users className="mx-auto mb-3 h-8 w-8 text-gray-600" />
      <p className="font-medium text-gray-300">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  );
}

export default function DirectoriaPage() {
  const { session } = useAuth();
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const { data, loading, error, reload } = useConvexQuery<DirectoriaManagementData>(
    "users:getDirectoriaManagementData",
    { sessionToken: session?.token ?? "" },
    !session || session.role !== "sysadmin"
  );

  const term = useMemo(() => normalizeSearch(search), [search]);

  const members = useMemo(() => {
    return (data?.members ?? []).filter((user) => {
      if (!term) return true;
      return [user.name, user.email ?? "", user.unit ?? ""].some((value) =>
        value.toLowerCase().includes(term)
      );
    });
  }, [data?.members, term]);

  const candidates = useMemo(() => {
    return (data?.candidates ?? []).filter((user) => {
      if (!term) return true;
      return [user.name, user.email ?? "", user.unit ?? ""].some((value) =>
        value.toLowerCase().includes(term)
      );
    });
  }, [data?.candidates, term]);

  if (!session) return null;

  if (session.role !== "sysadmin") {
    return (
      <div className="rounded-3xl border border-red-900/40 bg-red-950/20 p-6 text-center text-red-200">
        <ShieldCheck className="mx-auto mb-3 h-10 w-10" />
        <h2 className="text-lg font-semibold">Acesso restrito ao Sysadmin</h2>
        <p className="mt-2 text-sm text-red-200/80">
          Somente o sysadmin pode conceder ou remover o papel administrativo de diretoria.
        </p>
      </div>
    );
  }

  async function promote(user: ManagedUser) {
    if (!session) return;
    const confirmed = confirm(
      `Promover ${user.name} à Diretoria?\n\n${SENSITIVE_ACCESS_TEXT}\n\nConfirme apenas se esta pessoa deve acessar informações administrativas, financeiras e funcionais da associação.`
    );
    if (!confirmed) return;

    setActiveAction(user._id);
    setFeedback(null);
    try {
      await convexMutation("users:promoteAssociateToDirectoria", {
        sessionToken: session.token,
        id: user._id,
      });
      setFeedback({ type: "ok", text: `${user.name} agora pertence à Diretoria e recebeu acesso administrativo.` });
      reload();
    } catch (err: unknown) {
      setFeedback({ type: "err", text: err instanceof Error ? err.message : "Erro ao promover associado." });
    } finally {
      setActiveAction(null);
    }
  }

  async function remove(user: ManagedUser) {
    if (!session) return;
    const confirmed = confirm(
      `Remover ${user.name} da Diretoria?\n\nEsta ação rebaixa o usuário para Associado e revoga o acesso administrativo a dados sensíveis, financeiros e funcionais do sistema.`
    );
    if (!confirmed) return;

    setActiveAction(user._id);
    setFeedback(null);
    try {
      await convexMutation("users:removeDirectoriaRole", {
        sessionToken: session.token,
        id: user._id,
      });
      setFeedback({ type: "ok", text: `${user.name} foi removido da Diretoria e voltou ao papel de Associado.` });
      reload();
    } catch (err: unknown) {
      setFeedback({ type: "err", text: err instanceof Error ? err.message : "Erro ao remover papel de diretoria." });
    } finally {
      setActiveAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-emerald-800/60 bg-gradient-to-br from-emerald-950/80 via-gray-950 to-blue-950/70 p-5 shadow-2xl shadow-emerald-950/20 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-600/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
              <ShieldCheck className="h-4 w-4" />
              Painel exclusivo do sysadmin
            </span>
            <div>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">Gestão da Diretoria</h1>
              <p className="mt-2 text-sm leading-6 text-emerald-50/75 sm:text-base">
                Promova associados ativos para a diretoria ou remova esse papel quando o mandato, a função ou a necessidade de acesso administrativo terminar.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-72">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-emerald-200/70">Diretoria</p>
              <p className="mt-1 text-2xl font-bold text-white">{data?.members.length ?? 0}</p>
              <p className="text-xs text-gray-400">membro(s) ativo(s)</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-emerald-200/70">Elegíveis</p>
              <p className="mt-1 text-2xl font-bold text-white">{data?.candidates.length ?? 0}</p>
              <p className="text-xs text-gray-400">associado(s) ativo(s)</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-yellow-700/50 bg-yellow-950/30 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <AlertTriangle className="h-6 w-6 flex-shrink-0 text-yellow-300" />
          <div>
            <h2 className="font-semibold text-yellow-100">Permissão administrativa sensível</h2>
            <p className="mt-1 text-sm leading-6 text-yellow-100/80">
              {SENSITIVE_ACCESS_TEXT} A promoção deve ser usada somente para associados que efetivamente fazem parte da governança da associação. Apenas associados ativos aparecem como candidatos; moradores não podem ser promovidos por este painel.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-800 bg-gray-900/70 p-4 sm:p-5">
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-400">Buscar pessoas</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, e-mail ou unidade"
            className="w-full rounded-2xl border border-gray-700 bg-gray-950 py-3 pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-emerald-500"
          />
        </div>
      </section>

      {feedback && (
        <p className={`rounded-2xl px-4 py-3 text-sm ${feedback.type === "ok" ? "border border-emerald-700/50 bg-emerald-950/40 text-emerald-200" : "border border-red-800/60 bg-red-950/40 text-red-200"}`}>
          {feedback.text}
        </p>
      )}

      {loading ? (
        <div className="rounded-3xl border border-gray-800 bg-gray-900/70 p-8 text-center text-gray-400">Carregando gestão da diretoria…</div>
      ) : error ? (
        <div className="rounded-3xl border border-red-900/50 bg-red-950/30 p-5 text-red-200">{error}</div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <section className="space-y-4 rounded-3xl border border-gray-800 bg-gray-900/70 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                  <BadgeCheck className="h-5 w-5 text-blue-300" />
                  Diretoria atual
                </h2>
                <p className="mt-1 text-sm text-gray-400">Usuários com acesso administrativo completo.</p>
              </div>
              <span className="rounded-full bg-blue-900/40 px-3 py-1 text-xs font-medium text-blue-200">{members.length}</span>
            </div>

            <div className="space-y-3">
              {members.length === 0 ? (
                <EmptyState title="Nenhum membro da diretoria encontrado" description="Quando um associado for promovido, ele aparecerá aqui." />
              ) : (
                members.map((user) => (
                  <PersonCard
                    key={user._id}
                    user={user}
                    actionLabel="Remover da Diretoria"
                    actionTone="remove"
                    disabled={activeAction !== null}
                    onAction={() => remove(user)}
                  />
                ))
              )}
            </div>
          </section>

          <section className="space-y-4 rounded-3xl border border-gray-800 bg-gray-900/70 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                  <Users className="h-5 w-5 text-emerald-300" />
                  Associados elegíveis
                </h2>
                <p className="mt-1 text-sm text-gray-400">Somente associados ativos podem receber o papel de diretoria.</p>
              </div>
              <span className="rounded-full bg-emerald-900/40 px-3 py-1 text-xs font-medium text-emerald-200">{candidates.length}</span>
            </div>

            <div className="space-y-3">
              {candidates.length === 0 ? (
                <EmptyState title="Nenhum associado elegível encontrado" description="Cadastre ou reative associados no painel de usuários antes de promover alguém à diretoria." />
              ) : (
                candidates.map((user) => (
                  <PersonCard
                    key={user._id}
                    user={user}
                    actionLabel="Promover à Diretoria"
                    actionTone="promote"
                    disabled={activeAction !== null}
                    onAction={() => promote(user)}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
