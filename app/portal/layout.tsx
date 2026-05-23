/**
 * portal/layout.tsx — Shell do Portal do Associado
 *
 * Mostra as abas de navegação e verifica se o usuário está logado.
 * Se não estiver logado, redireciona para /login.
 */
"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { AppFooter } from "@/components/app-footer";

// Definição das abas do portal
const TABS = [
  { href: "/portal/inicio",       label: "🏠 Início" },
  { href: "/portal/extrato",      label: "📋 Extrato" },
  { href: "/portal/mensalidade",  label: "💳 Mensalidade" },
  { href: "/portal/cadastro",     label: "👤 Meu Cadastro" },
  { href: "/portal/reservas",     label: "📅 Reservas" },
  { href: "/portal/comunicados",  label: "📢 Comunicados" },
  { href: "/portal/suporte",      label: "🔧 Suporte" },
];

// Badge colorido para cada papel (role)
function RoleBadge({ role }: { role: string }) {
  const labels: Record<string, string> = {
    associado: "Associado",
    morador: "Morador",
    diretoria: "Diretoria",
    sysadmin: "Sysadmin",
  };
  return (
    <span className="text-xs bg-emerald-900 text-emerald-300 px-2 py-0.5 rounded-full">
      {labels[role] ?? role}
    </span>
  );
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Redirecionar para login se não estiver autenticado
  useEffect(() => {
    if (!loading && !session) {
      router.push("/login");
    }
  }, [session, loading, router]);

  // Enquanto verifica a sessão, mostrar tela de carregamento
  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-page)" }}>
        <p className="text-emerald-200/70 animate-pulse">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg-page)", color: "var(--text-primary)" }}>

      {/* Topo: nome do usuário + logout */}
      <header className="border-b px-4 sm:px-6 py-3 flex items-center justify-between" style={{ backgroundColor: "var(--bg-nav)", borderColor: "var(--border-main)" }}>
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo clicável leva à Página Inicial pública */}
          <Link href="/" className="flex-shrink-0" title="Página Inicial">
            <img
              src="/logo-amtrs-48.png"
              alt="Logo AMRTS Santorini"
              className="h-10 w-10 rounded-xl object-cover ring-1 ring-emerald-300/30 shadow-sm hover:ring-emerald-200/60 transition"
            />
          </Link>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>{session.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {session.unit && (
                <span className="text-xs text-emerald-200/70">Unidade {session.unit}</span>
              )}
              <RoleBadge role={session.role} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
          {/* Link "← Início" visível em telas maiores */}
          <Link href="/" className="hidden sm:block text-xs text-emerald-200/50 hover:text-emerald-200 transition-colors">
            ← Início
          </Link>
          <button
            onClick={() => { logout(); router.push("/login"); }}
            className="text-sm text-emerald-200/70 hover:text-white transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Abas de navegação — rolam horizontalmente no mobile */}
      <nav className="border-b px-2 sm:px-6" style={{ backgroundColor: "var(--bg-drawer)", borderColor: "var(--border-main)" }}>
        <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
          {TABS.map((tab) => {
            // Verificar se o associado pode ver o extrato financeiro
            // Moradores não têm extrato próprio
            if (tab.href === "/portal/extrato" && session.role === "morador") {
              return null;
            }

            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-emerald-600/30 text-emerald-300"
                    : "text-emerald-200/70 hover:text-white hover:bg-emerald-900/50"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Conteúdo da aba */}
      <main className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full">
        {children}
        <AppFooter />
      </main>
    </div>
  );
}
