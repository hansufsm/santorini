/*
 * admin/layout.tsx — Shell do Painel Administrativo
 *
 * Verifica se o usuário tem papel diretoria ou sysadmin.
 * Se não, redireciona para /portal/inicio.
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { AppFooter } from "@/components/app-footer";
import { useFeatureFlags } from "@/lib/convex";
import { FeatureFlagGuard } from "@/components/feature-flag-guard";
import { PreferencesDrawer } from "@/components/preferences-drawer";

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  sysadminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/transacoes", label: "Transações", sysadminOnly: true },
  { href: "/admin/associados", label: "Associados" },
  { href: "/admin/inadimplencia", label: "Inadimplência" },
  { href: "/admin/diretoria", label: "Gestão da Diretoria", sysadminOnly: true },
  { href: "/admin/auditoria-diretoria", label: "Auditoria da Diretoria", sysadminOnly: true },
  { href: "/admin/reservas", label: "Reservas" },
  { href: "/admin/comunicados", label: "Comunicados" },
  { href: "/admin/manutencao", label: "Manutenção" },
  { href: "/admin/feedbacks", label: "Feedbacks" },
  { href: "/admin/trilha-viva", label: "Trilha Viva" },
  { href: "/admin/ajuda", label: "Ajuda" },
  { href: "/admin/usuarios", label: "Usuários", sysadminOnly: true },
  { href: "/admin/configuracoes", label: "Configurações", sysadminOnly: true },
];

const ROUTE_FLAGS: Record<string, string> = {
  "/admin/reservas": "module_reservations",
  "/admin/comunicados": "module_announcements",
  "/admin/manutencao": "module_maintenance",
  "/admin/feedbacks": "module_feedback",
  "/admin/trilha-viva": "module_trilha_viva",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [prefOpen, setPrefOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.push("/login");
      return;
    }
    if (session.role === "associado" || session.role === "morador") {
      router.push("/portal/inicio");
    }
  }, [session, loading, router]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-page)" }}>
        <p className="text-emerald-200/70 animate-pulse">Carregando…</p>
      </div>
    );
  }

  if (session.role === "associado" || session.role === "morador") {
    return null;
  }

  const { isEnabled } = useFeatureFlags();

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    const flag = ROUTE_FLAGS[item.href];
    if (flag && !isEnabled(flag)) return false;
    return !item.sysadminOnly || session.role === "sysadmin";
  });

  function NavLink({ href, label, exact, onClick }: NavItem & { onClick?: () => void }) {
    const active = exact ? pathname === href : pathname.startsWith(href);
    return (
      <Link
        href={href}
        onClick={onClick}
        className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
          active
            ? "bg-emerald-600/20 text-emerald-300 ring-1 ring-emerald-400/15"
            : "text-emerald-200/70 hover:bg-emerald-900/50 hover:text-white"
        }`}
      >
        {label}
      </Link>
    );
  }

  const renderDrawerContent = (onClick?: () => void) => (
    <>
      <div className="flex items-center gap-3 px-1">
        <img
          src="/logo-amtrs-48.png"
          alt="Logo AMRTS Santorini"
          className="h-9 w-9 rounded-xl object-cover ring-1 ring-emerald-300/30 shadow-sm"
        />
        <div>
          <span className="block font-bold text-sm" style={{ color: "var(--text-primary)" }}>Santorini Admin</span>
          <span className="block text-xs capitalize text-emerald-300/65">{session.role}</span>
        </div>
      </div>

      <nav className="mt-8 flex-1 space-y-1">
        {visibleNavItems.map((item) => (
          <NavLink key={item.href} {...item} onClick={onClick} />
        ))}
      </nav>

      <div className="border-t pt-4 mt-4 space-y-1" style={{ borderColor: "var(--border-main)" }}>
        <p className="text-xs text-emerald-200/70 truncate px-1">{session.name}</p>
        <p className="text-xs text-emerald-500 capitalize px-1 mb-2">{session.role}</p>
        <Link
          href="/"
          onClick={onClick}
          className="block w-full text-left text-xs text-emerald-200/50 hover:text-emerald-200 px-1 py-1 transition-colors"
        >
          Página inicial pública
        </Link>
        <button
          onClick={() => { setPrefOpen(true); if (onClick) onClick(); }}
          className="w-full text-left text-xs text-emerald-200/60 hover:text-white px-1 py-1 transition-colors cursor-pointer"
        >
          Preferências
        </button>
        <button
          onClick={() => { logout(); router.push("/login"); }}
          className="w-full text-left text-xs text-emerald-200/60 hover:text-white px-1 py-1 transition-colors cursor-pointer"
        >
          Sair
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--bg-page)", color: "var(--text-primary)" }}>
      <aside className="hidden md:flex flex-col w-60 border-r p-4" style={{ backgroundColor: "var(--bg-drawer)", borderColor: "var(--border-main)" }}>
        {renderDrawerContent()}
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/60"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative flex h-full w-80 max-w-[88vw] flex-col border-r p-4 shadow-2xl" style={{ backgroundColor: "var(--bg-drawer)", borderColor: "var(--border-main)" }}>
            {renderDrawerContent(() => setDrawerOpen(false))}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden border-b px-4 py-3 flex items-center justify-between" style={{ backgroundColor: "var(--bg-nav)", borderColor: "var(--border-main)" }}>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-xl border border-emerald-700/50 px-3 py-2 text-sm font-semibold text-emerald-100/80 transition hover:bg-emerald-900/50"
          >
            Menu
          </button>
          <span className="flex items-center gap-2 font-bold text-sm" style={{ color: "var(--text-primary)" }}>
            <img
              src="/logo-amtrs-32.png"
              alt="Logo AMRTS Santorini"
              className="h-7 w-7 rounded-lg object-cover ring-1 ring-emerald-300/30"
            />
            Santorini Admin
          </span>
          <button
            onClick={() => setPrefOpen(true)}
            className="rounded-xl border border-emerald-800/65 bg-emerald-950/20 px-3 py-2 text-xs font-bold text-emerald-200/80 hover:text-white transition hover:bg-emerald-900/45 cursor-pointer"
          >
            Preferências
          </button>
        </header>

        <main className="flex-1 w-full max-w-7xl p-4 sm:p-6 xl:p-8">
          <FeatureFlagGuard flagKey={
            Object.keys(ROUTE_FLAGS).find(route => pathname === route || pathname.startsWith(route + "/"))
              ? ROUTE_FLAGS[Object.keys(ROUTE_FLAGS).find(route => pathname === route || pathname.startsWith(route + "/"))!]
              : ""
          }>
            {children}
          </FeatureFlagGuard>
          <AppFooter />
        </main>
      </div>
      <PreferencesDrawer isOpen={prefOpen} onClose={() => setPrefOpen(false)} />
    </div>
  );
}
