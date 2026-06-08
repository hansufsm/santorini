"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useConvexQuery, convexMutation } from "@/lib/convex";
import {
  Sliders,
  CalendarDays,
  Megaphone,
  Wrench,
  Users,
  BookOpen,
  LineChart,
  FileCheck,
  Cloud,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  MessageSquare
} from "lucide-react";

type SettingItem = {
  _id: string;
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  category: "modulo" | "sistema" | "integracao";
  updatedAt?: number;
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  module_reservations: CalendarDays,
  module_announcements: Megaphone,
  module_maintenance: Wrench,
  module_visitors: Users,
  module_feedback: MessageSquare,
  module_trilha_viva: BookOpen,
  module_extrato: LineChart,
  module_mensalidade: FileCheck,
  integration_pcloud: Cloud,
};

export default function SettingsPage() {
  const { session, loading: authLoading } = useAuth();
  const [updatingKeys, setUpdatingKeys] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const {
    data: settings,
    loading: settingsLoading,
    reload,
  } = useConvexQuery<SettingItem[]>("settings:listSettings", {
    sessionToken: session?.token ?? "",
  }, !session);

  if (authLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin" />
          <p className="text-emerald-200/50 text-sm animate-pulse">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  if (!session || session.role !== "sysadmin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 bg-slate-900/40 border border-red-950/40 rounded-2xl">
        <Lock className="h-12 w-12 text-red-400 mb-4 animate-bounce" />
        <h2 className="text-lg font-bold text-red-200">Acesso Restrito</h2>
        <p className="text-sm text-red-200/60 max-w-sm mt-1">
          Apenas usuários com perfil de Sysadmin podem acessar as configurações globais do sistema.
        </p>
      </div>
    );
  }

  async function handleToggle(key: string, currentEnabled: boolean) {
    if (updatingKeys[key]) return;
    setUpdatingKeys((prev) => ({ ...prev, [key]: true }));
    setMessage(null);

    try {
      await convexMutation("settings:toggleFlag", {
        sessionToken: session!.token,
        key,
        enabled: !currentEnabled,
      });
      setMessage({
        text: `Configuração "${key}" atualizada com sucesso!`,
        type: "success",
      });
      reload();
    } catch (err: any) {
      setMessage({
        text: err.message || "Erro ao atualizar configuração.",
        type: "error",
      });
    } finally {
      setUpdatingKeys((prev) => ({ ...prev, [key]: false }));
    }
  }

  const modules = settings?.filter((s) => s.category === "modulo") ?? [];
  const integrations = settings?.filter((s) => s.category === "integracao") ?? [];
  const system = settings?.filter((s) => s.category === "sistema") ?? [];

  function SettingCard({ item }: { item: SettingItem }) {
    const Icon = ICON_MAP[item.key] || Sliders;
    const isUpdating = !!updatingKeys[item.key];

    return (
      <div className="flex items-start justify-between p-4 sm:p-5 rounded-2xl bg-slate-900/40 border border-emerald-950/30 hover:border-emerald-800/20 transition duration-300">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 mt-0.5">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm sm:text-base text-slate-100">{item.label}</h4>
            <p className="text-xs sm:text-sm text-emerald-200/60 mt-1 max-w-xl">{item.description}</p>
            <span className="inline-block text-[10px] uppercase font-bold px-2 py-0.5 mt-2 rounded bg-slate-800 text-slate-400">
              Chave: {item.key}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 self-center pl-4">
          <span className={`text-xs font-semibold hidden sm:inline ${item.enabled ? "text-emerald-400" : "text-slate-500"}`}>
            {item.enabled ? "Ativo" : "Inativo"}
          </span>
          <button
            onClick={() => handleToggle(item.key, item.enabled)}
            disabled={isUpdating}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              item.enabled ? "bg-emerald-600" : "bg-slate-700/60"
            } ${isUpdating ? "opacity-50 cursor-not-allowed" : ""}`}
            type="button"
            aria-label={`Alternar ${item.label}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                item.enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sliders className="h-6 w-6 text-emerald-400" />
            Configurações do Sistema
          </h1>
          <p className="text-sm text-emerald-200/70 mt-1">
            Ative ou desative módulos do portal e gerencie parâmetros globais da plataforma Santorini.
          </p>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-lg ${
          message.type === "success"
            ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-200"
            : "bg-red-950/40 border-red-500/30 text-red-200"
        }`}>
          {message.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
          )}
          <div>
            <p className="text-sm font-semibold">{message.type === "success" ? "Sucesso!" : "Erro"}</p>
            <p className="text-xs opacity-90 mt-0.5">{message.text}</p>
          </div>
        </div>
      )}

      {/* Seção Módulos */}
      <div className="space-y-4">
        <div className="border-b border-emerald-950/20 pb-2">
          <h2 className="text-lg font-bold text-emerald-300">Módulos do Portal</h2>
          <p className="text-xs text-emerald-200/50">Funcionalidades visíveis para moradores e associados.</p>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {modules.map((item) => (
            <SettingCard key={item.key} item={item} />
          ))}
        </div>
      </div>

      {/* Seção Integrações */}
      {integrations.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="border-b border-emerald-950/20 pb-2">
            <h2 className="text-lg font-bold text-emerald-300">Integrações de Dados</h2>
            <p className="text-xs text-emerald-200/50">Fluxos de sincronização externa e importações.</p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {integrations.map((item) => (
              <SettingCard key={item.key} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Seção Sistema */}
      {system.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="border-b border-emerald-950/20 pb-2">
            <h2 className="text-lg font-bold text-emerald-300">Ajustes do Sistema</h2>
            <p className="text-xs text-emerald-200/50">Comportamentos e parâmetros de segurança.</p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {system.map((item) => (
              <SettingCard key={item.key} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
