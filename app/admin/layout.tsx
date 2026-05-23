/**
 * admin/layout.tsx — Shell do Painel Administrativo
 *
 * Verifica se o usuário tem papel diretoria ou sysadmin.
 * Se não, redireciona para /portal/inicio.
 */
"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { AppFooter } from "@/components/app-footer";

// Itens do menu lateral
const NAV_ITEMS = [
  { href: "/admin", label: "📊 Dashboard", exact: true },
  { href: "/admin/transacoes", label: "💰 Transações" },
  { href: "/admin/associados", label: "👥 Associados" },
  { href: "/admin/reservas", label: "📅 Reservas" },
  { href: "/admin/comunicados", label: "📢 Comunicados" },
  { href: "/admin/manutencao", label: "🔧 Manutenção" },
];

// Apenas sysadmin vê esta seção
const SYSADMIN_ITEMS = [
  { href: "/admin/usuarios", label: "🔑 Usuários" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Verificar autenticação e papel
  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.push("/login");
      return;
    }
    // Moradores e Associados não têm acesso ao admin
    if (session.role === "associado" || session.role === "morador") {
      router.push("/portal/inicio");
    }
  }, [session, loading, router]);

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-page)" }}>
        <p className="text-emerald-200/70 animate-pulse">Carregando…</p>
      </div>
    );
  }

  if (session.role === "associado" || session.role === "morador") {
    return null; // Será redirecionado pelo useEffect
  }

  function NavLink({ href, label, exact }: { href: string; label: string; exact?: boolean }) {
    const isActive = exact ? pathname === href : pathname.startsWith(href) && pathname !== "/admin" || (exact && pathname === href);
    const active = exact ? pathname === href : pathname.startsWith(href);
    return (
      <Link
        href={href}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
          active
            ? "bg-emerald-600/20 text-emerald-300"
            : "text-emerald-200/70 hover:text-white hover:bg-emerald-900/50"
        }`}
      >
        {label}
      </Link>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--bg-page)", color: "var(--text-primary)" }}>

      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-56 border-r p-4" style={{ backgroundColor: "var(--bg-drawer)", borderColor: "var(--border-main)" }}>
        <div className="flex items-center gap-3 mb-8 px-1">
          <img
            src="/logo-amtrs-48.png"
            alt="Logo AMRTS Santorini"
            className="h-9 w-9 rounded-xl object-cover ring-1 ring-emerald-300/30 shadow-sm"
          />
          <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Santorini Admin</span>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}

          {/* Seção exclusiva do sysadmin */}
          {session.role === "sysadmin" && (
            <>
              <div className="pt-4 pb-2 px-1">
                <p className="text-xs text-emerald-700 uppercase tracking-widest">Sistema</p>
              </div>
              {SYSADMIN_ITEMS.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </>
          )}
        </nav>

        {/* Usuário logado + link para página inicial */}
        <div className="border-t pt-4 mt-4" style={{ borderColor: "var(--border-main)" }}>
          <p className="text-xs text-emerald-200/70 truncate px-1">{session.name}</p>
          <p className="text-xs text-emerald-500 capitalize px-1 mb-2">{session.role}</p>
          {/* Link para o dashboard público */}
          <Link
            href="/"
            className="block w-full text-left text-xs text-emerald-200/50 hover:text-emerald-200 px-1 py-1 transition-colors"
          >
            ← Página Inicial
          </Link>
          <button
            onClick={() => { logout(); router.push("/login"); }}
            className="w-full text-left text-xs text-emerald-200/60 hover:text-white px-1 py-1 transition-colors"
          >
            Sair →
          </button>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar mobile */}
        <header className="md:hidden border-b px-4 py-3 flex items-center justify-between" style={{ backgroundColor: "var(--bg-nav)", borderColor: "var(--border-main)" }}>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 font-bold text-sm" style={{ color: "var(--text-primary)" }}>
              <img
                src="/logo-amtrs-32.png"
                alt="Logo AMRTS Santorini"
                className="h-7 w-7 rounded-lg object-cover ring-1 ring-emerald-300/30"
              />
              Santorini Admin
            </span>
            {/* Link para página inicial no mobile */}
            <Link href="/" className="text-xs text-emerald-200/50 hover:text-emerald-200 transition-colors">
              ← Início
            </Link>
          </div>
          <button
            onClick={() => { logout(); router.push("/login"); }}
            className="text-sm text-emerald-200/70 hover:text-white"
          >
            Sair
          </button>
        </header>

        {/* Nav mobile — horizontal scroll */}
        <nav className="md:hidden border-b px-2 py-2 flex gap-1 overflow-x-auto" style={{ backgroundColor: "var(--bg-drawer)", borderColor: "var(--border-main)" }}>
          {[...NAV_ITEMS, ...(session.role === "sysadmin" ? SYSADMIN_ITEMS : [])].map((item) => {
            const isActive = item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-600/30 text-emerald-300"
                    : "text-emerald-200/70 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 w-full max-w-7xl p-4 sm:p-6 xl:p-8">
          {children}
          <AppFooter />
        </main>
      </div>
    </div>
  );
}
