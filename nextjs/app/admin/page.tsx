/**
 * admin/page.tsx — Painel da Diretoria / Sysadmin
 *
 * TODO Fase 2B: conectar os cards de estatísticas ao Convex.
 */
"use client";

import { useAuth } from "@/lib/auth";

function StatCard({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="text-2xl mb-2">{emoji}</div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}

export default function AdminPage() {
  const { session } = useAuth();

  if (!session) return null;

  return (
    <div className="space-y-6">

      <div>
        <h2 className="text-xl font-bold text-white">
          Painel Administrativo
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Bem-vindo, {session.name}. Papel:{" "}
          <span className="text-emerald-400 font-medium capitalize">{session.role}</span>
        </p>
      </div>

      {/* Cards de resumo — TODO Fase 2B: conectar ao Convex */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard emoji="💰" label="Total Transações" value="—" />
        <StatCard emoji="👥" label="Associados Ativos" value="—" />
        <StatCard emoji="📅" label="Reservas Pendentes" value="—" />
        <StatCard emoji="🔧" label="Chamados Abertos" value="—" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-gray-500">
        <p className="text-sm">
          Módulos completos disponíveis na Fase 2B da migração.
        </p>
        <p className="text-xs mt-2">
          Enquanto isso, use o sistema atual em{" "}
          <a
            href="https://zionsti.github.io/santorini"
            target="_blank"
            className="text-emerald-400 underline"
            rel="noreferrer"
          >
            zionsti.github.io/santorini
          </a>
        </p>
      </div>
    </div>
  );
}
