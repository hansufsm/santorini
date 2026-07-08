"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sun, Moon, Sliders, X, User, HelpCircle, MessageSquare, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface PreferencesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PreferencesDrawer({ isOpen, onClose }: PreferencesDrawerProps) {
  const { session, logout } = useAuth();
  const router = useRouter();
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsLight(document.documentElement.classList.contains("theme-light"));
    }
  }, [isOpen]);

  function toggleTheme(light: boolean) {
    setIsLight(light);
    if (typeof window !== "undefined") {
      document.documentElement.classList.toggle("theme-light", light);
      localStorage.setItem("snt-theme", light ? "light" : "dark");
    }
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 z-[110] w-full max-w-sm bg-emerald-950/95 border-l border-emerald-800/40 p-6 shadow-2xl flex flex-col justify-between overflow-hidden text-white">
        
        <div className="space-y-6 overflow-y-auto pr-2">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-emerald-900/60 pb-4">
            <div className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-emerald-400" />
              <h3 className="text-lg font-bold">Painel de Preferências</h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-full bg-emerald-900/40 p-1.5 text-emerald-300 hover:bg-emerald-900/80 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Seção Conta */}
          {session && (
            <div className="rounded-2xl bg-emerald-900/20 border border-emerald-800/45 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-700/30 p-2.5 text-emerald-300">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{session.name}</p>
                  <p className="text-[11px] text-emerald-200/50 uppercase tracking-wider mt-0.5">
                    {session.role} {session.unit ? `• Unidade ${session.unit}` : ""}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Seção Tema */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Tema Visual</h4>
            <div className="grid grid-cols-2 gap-2 bg-emerald-900/10 border border-emerald-900/40 rounded-xl p-1">
              <button
                type="button"
                onClick={() => toggleTheme(false)}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-medium transition-all ${
                  !isLight
                    ? "bg-emerald-600 text-white shadow shadow-emerald-950/40"
                    : "text-emerald-200/60 hover:bg-emerald-900/30"
                }`}
              >
                <Moon className="h-4 w-4" />
                Modo Escuro
              </button>
              <button
                type="button"
                onClick={() => toggleTheme(true)}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-medium transition-all ${
                  isLight
                    ? "bg-emerald-600 text-white shadow shadow-emerald-950/40"
                    : "text-emerald-200/60 hover:bg-emerald-900/30"
                }`}
              >
                <Sun className="h-4 w-4" />
                Modo Claro
              </button>
            </div>
          </div>

          {/* Links de Atalho */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Central de Suporte</h4>
            <div className="space-y-1.5">
              <button
                onClick={() => {
                  onClose();
                  router.push(session?.role === "diretoria" || session?.role === "sysadmin" ? "/admin/ajuda" : "/portal/ajuda");
                }}
                className="w-full flex items-center justify-between rounded-xl border border-emerald-900/40 hover:bg-emerald-900/20 px-4 py-3 text-xs font-semibold text-emerald-100 transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <HelpCircle className="h-4 w-4 text-emerald-400" />
                  Visualizar Ajuda e Manuais
                </span>
                <span className="text-[10px] text-emerald-300/45">Ir</span>
              </button>

              <button
                onClick={() => {
                  // Abre o feedback flutuante (que fica no canto inferior direito)
                  onClose();
                  const btn = document.querySelector('[aria-label="Abrir formulário de feedback"]') as HTMLButtonElement | null;
                  if (btn) btn.click();
                }}
                className="w-full flex items-center justify-between rounded-xl border border-emerald-900/40 hover:bg-emerald-900/20 px-4 py-3 text-xs font-semibold text-emerald-100 transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <MessageSquare className="h-4 w-4 text-emerald-400" />
                  Enviar Feedback Comunitário
                </span>
                <span className="text-[10px] text-emerald-300/45">Abrir</span>
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé — Logout */}
        <div className="border-t border-emerald-900/60 pt-4 mt-6">
          <button
            onClick={() => {
              onClose();
              logout();
              router.push("/login");
            }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-red-950/40 border border-red-900/40 hover:bg-red-900/30 text-red-300 font-bold py-3 text-xs tracking-wider uppercase transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Encerrar Sessão (Sair)
          </button>
          <p className="text-center text-[10px] text-emerald-300/25 mt-4">
            Santorini v3.0 • Todos os direitos reservados
          </p>
        </div>

      </div>
    </>
  );
}
