/**
 * admin/page.tsx — Visão geral do painel administrativo
 * Mostra estatísticas em tempo real do condomínio.
 */
"use client";

import { useAuth } from "@/lib/auth";
import { useConvexQuery } from "@/lib/convex";
import { formatCurrency } from "@/lib/utils";

// Tipos retornados pelo Convex
type TxSummary = {
  totalReceived: number;
  totalSent: number;
  netBalance: number;
  contributorsCount: number;
  totalTransactions: number;
};

type AssocSummary = {
  total: number;
  ativos: number;
  inativos: number;
  inadimplentes: number;
};

type Reservation = { status: string; deletedAt?: number };
type Maintenance = { status: string; deletedAt?: number };

function StatCard({ emoji, label, value, sub, color }: { emoji: string; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="text-2xl mb-2">{emoji}</div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color ?? "text-white"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminPage() {
  const { session } = useAuth();

  // Carregar estatísticas em paralelo
  const { data: txSummary } = useConvexQuery<TxSummary>("transactions:getSummary");
  const { data: assocSummary } = useConvexQuery<AssocSummary>("associates:getAssociatesSummary");
  const { data: reservas } = useConvexQuery<Reservation[]>("reservations:getAllReservations");
  const { data: chamados } = useConvexQuery<Maintenance[]>("maintenances:getAllMaintenances");

  if (!session) return null;

  // Contar reservas pendentes e chamados abertos
  const pendingReservations = reservas?.filter((r) => r.status === "pendente").length ?? 0;
  const openMaintenances = chamados?.filter((m) => m.status === "aberto").length ?? 0;

  return (
    <div className="space-y-6">

      <div>
        <h2 className="text-xl font-bold text-white">Painel Administrativo</h2>
        <p className="text-sm text-gray-400 mt-1">
          Bem-vindo, {session.name}.{" "}
          <span className="text-emerald-400 capitalize">{session.role}</span>
        </p>
      </div>

      {/* Cards financeiros */}
      <div>
        <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-3">Financeiro</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            emoji="💰"
            label="Total Recebido"
            value={txSummary ? formatCurrency(txSummary.totalReceived) : "—"}
            color="text-emerald-400"
          />
          <StatCard
            emoji="💸"
            label="Total Saído"
            value={txSummary ? formatCurrency(txSummary.totalSent) : "—"}
            color="text-red-400"
          />
          <StatCard
            emoji="📊"
            label="Saldo Líquido"
            value={txSummary ? formatCurrency(txSummary.netBalance) : "—"}
            color={txSummary && txSummary.netBalance >= 0 ? "text-emerald-400" : "text-red-400"}
          />
          <StatCard
            emoji="🔄"
            label="Transações"
            value={txSummary ? String(txSummary.totalTransactions) : "—"}
          />
        </div>
      </div>

      {/* Cards operacionais */}
      <div>
        <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-3">Operacional</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            emoji="👥"
            label="Associados Ativos"
            value={assocSummary ? String(assocSummary.ativos) : "—"}
            sub={assocSummary ? `${assocSummary.inadimplentes} inadimplentes` : undefined}
          />
          <StatCard
            emoji="⚠️"
            label="Inadimplentes"
            value={assocSummary ? String(assocSummary.inadimplentes) : "—"}
            color={assocSummary && assocSummary.inadimplentes > 0 ? "text-yellow-400" : "text-white"}
          />
          <StatCard
            emoji="📅"
            label="Reservas Pendentes"
            value={String(pendingReservations)}
            color={pendingReservations > 0 ? "text-yellow-400" : "text-white"}
          />
          <StatCard
            emoji="🔧"
            label="Chamados Abertos"
            value={String(openMaintenances)}
            color={openMaintenances > 0 ? "text-yellow-400" : "text-white"}
          />
        </div>
      </div>

      {/* Links rápidos */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">⚡ Ações Rápidas</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { href: "/admin/transacoes", label: "📥 Importar CSV" },
            { href: "/admin/comunicados", label: "📢 Novo Comunicado" },
            { href: "/admin/reservas", label: "📅 Ver Reservas" },
            { href: "/admin/associados", label: "👥 Associados" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

    </div>
  );
}
