/**
 * portal/layout.tsx — Shell do Portal do Associado
 *
 * Mostra navegação lateral por papel e verifica se o usuário está logado.
 * Se não estiver logado, redireciona para /login.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { AppFooter } from "@/components/app-footer";
import { TrilhaVivaGuideCard } from "@/components/trilha-viva-guide";

type PortalNavItem = {
  href: string;
  label: string;
  roles?: string[];
};

const NAV_ITEMS: PortalNavItem[] = [
  { href: "/portal/inicio", label: "Início" },
  { href: "/portal/mensalidade", label: "Verificação de pagamento", roles: ["associado"] },
  { href: "/portal/extrato", label: "Extrato financeiro", roles: ["associado"] },
  { href: "/portal/cadastro", label: "Meu cadastro" },
  { href: "/portal/reservas", label: "Reservas" },
  { href: "/portal/comunicados", label: "Comunicados" },
  { href: "/portal/suporte", label: "Suporte" },
  { href: "/portal/ajuda", label: "Ajuda e manuais" },
];

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

function NavLink({ href, label, active, onClick }: { href: string; label: string; active: boolean; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-emerald-600/25 text-emerald-200 ring-1 ring-emerald-400/20"
          : "text-emerald-100/65 hover:bg-emerald-900/45 hover:text-white"
      }`}
    >
      {label}
    </Link>
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
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!loading && !session) {
      router.push("/login");
    }
  }, [session, loading, router]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const visibleNavItems = useMemo(() => {
    if (!session) return [];
    return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(session.role));
  }, [session]);

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-page)" }}>
        <p className="text-emerald-200/70 animate-pulse">Carregando…</p>
      </div>
    );
  }

  const renderDrawerContent = (onClick?: () => void) => (
    <>
      <div className="flex items-center gap-3 px-1">
        <Link href="/" className="flex-shrink-0" title="Página Inicial" onClick={onClick}>
          <img
            src="/logo-amtrs-48.png"
            alt="Logo AMRTS Santorini"
            className="h-10 w-10 rounded-xl object-cover ring-1 ring-emerald-300/30 shadow-sm hover:ring-emerald-200/60 transition"
          />
        </Link>
        <div>
          <p className="text-sm font-bold text-white">Portal Santorini</p>
          <p className="text-xs text-emerald-200/50">Navegação por perfil</p>
        </div>
      </div>

      <nav className="mt-8 flex-1 space-y-1">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            active={pathname === item.href}
            onClick={onClick}
          />
        ))}
      </nav>

      <div className="mt-6 border-t pt-4" style={{ borderColor: "var(--border-main)" }}>
        <p className="truncate px-1 text-xs text-emerald-200/70">{session.name}</p>
        {session.unit && <p className="px-1 text-xs text-emerald-200/45">Unidade {session.unit}</p>}
        <div className="mt-2 px-1"><RoleBadge role={session.role} /></div>
        <Link href="/" onClick={onClick} className="mt-3 block px-1 py-1 text-xs text-emerald-200/50 transition-colors hover:text-emerald-200">
          Página inicial pública
        </Link>
        <button
          onClick={() => { logout(); router.push("/login"); }}
          className="w-full px-1 py-1 text-left text-xs text-emerald-200/60 transition-colors hover:text-white"
        >
          Sair
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen md:flex" style={{ backgroundColor: "var(--bg-page)", color: "var(--text-primary)" }}>
      <aside className="hidden md:flex md:w-64 md:flex-col border-r p-4" style={{ backgroundColor: "var(--bg-drawer)", borderColor: "var(--border-main)" }}>
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

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b px-4 sm:px-6 py-3 flex items-center justify-between" style={{ backgroundColor: "var(--bg-nav)", borderColor: "var(--border-main)" }}>
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="rounded-xl border border-emerald-700/50 px-3 py-2 text-sm font-semibold text-emerald-100/80 transition hover:bg-emerald-900/50 md:hidden"
            >
              Menu
            </button>
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
          <button
            onClick={() => { logout(); router.push("/login"); }}
            className="text-sm text-emerald-200/70 hover:text-white transition-colors"
          >
            Sair
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full">
          {pathname !== "/portal/inicio" && <TrilhaVivaGuideCard pathname={pathname} role={session.role} />}
          {children}
          <AppFooter />
        </main>
      </div>
    </div>
  );
}
