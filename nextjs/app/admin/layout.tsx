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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Carregando…</p>
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
            : "text-gray-400 hover:text-white hover:bg-gray-800"
        }`}
      >
        {label}
      </Link>
    );
  }

  return (
    <div className="min-h-screen flex">

      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-gray-900 border-r border-gray-800 p-4">
        <div className="flex items-center gap-2 mb-8 px-1">
          <span className="text-xl">🏖️</span>
          <span className="font-bold text-white text-sm">Santorini Admin</span>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}

          {/* Seção exclusiva do sysadmin */}
          {session.role === "sysadmin" && (
            <>
              <div className="pt-4 pb-2 px-1">
                <p className="text-xs text-gray-600 uppercase tracking-widest">Sistema</p>
              </div>
              {SYSADMIN_ITEMS.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </>
          )}
        </nav>

        {/* Usuário logado + link para página inicial */}
        <div className="border-t border-gray-800 pt-4 mt-4">
          <p className="text-xs text-gray-400 truncate px-1">{session.name}</p>
          <p className="text-xs text-emerald-500 capitalize px-1 mb-2">{session.role}</p>
          {/* Link para o dashboard público */}
          <Link
            href="/"
            className="block w-full text-left text-xs text-gray-500 hover:text-gray-300 px-1 py-1 transition-colors"
          >
            ← Página Inicial
          </Link>
          <button
            onClick={() => { logout(); router.push("/login"); }}
            className="w-full text-left text-xs text-gray-500 hover:text-white px-1 py-1 transition-colors"
          >
            Sair →
          </button>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar mobile */}
        <header className="md:hidden bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-white text-sm">🏖️ Santorini Admin</span>
            {/* Link para página inicial no mobile */}
            <Link href="/" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              ← Início
            </Link>
          </div>
          <button
            onClick={() => { logout(); router.push("/login"); }}
            className="text-sm text-gray-400 hover:text-white"
          >
            Sair
          </button>
        </header>

        {/* Nav mobile — horizontal scroll */}
        <nav className="md:hidden bg-gray-900 border-b border-gray-800 px-2 py-2 flex gap-1 overflow-x-auto">
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
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 p-4 sm:p-6 max-w-5xl">
          {children}
        </main>
      </div>
    </div>
  );
}
