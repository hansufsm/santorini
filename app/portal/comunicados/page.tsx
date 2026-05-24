/**
 * portal/comunicados/page.tsx — Comunicados do residencial
 * Lista todos os comunicados ativos para os moradores.
 */
"use client";

import { useAuth } from "@/lib/auth";
import { useConvexQuery } from "@/lib/convex";
import { formatTimestamp } from "@/lib/utils";

type Announcement = {
  _id: string;
  title: string;
  content: string;
  type: "info" | "urgente" | "manutencao" | "evento";
  createdAt: number;
};

// Cores e rótulos por tipo
const TYPE_STYLE: Record<string, { badge: string; label: string }> = {
  info:       { badge: "bg-blue-900/50 text-blue-300",     label: "ℹ️ Informativo" },
  urgente:    { badge: "bg-red-900/50 text-red-300",       label: "🚨 Urgente" },
  manutencao: { badge: "bg-yellow-900/50 text-yellow-300", label: "🔧 Manutenção" },
  evento:     { badge: "bg-purple-900/50 text-purple-300", label: "🎉 Evento" },
};

export default function ComunicadosPage() {
  const { session } = useAuth();

  const { data: comunicados, loading, error } = useConvexQuery<Announcement[]>(
    "announcements:getActiveAnnouncements"
  );

  if (!session) return null;

  if (loading) return <div className="text-gray-400 text-center py-12">Carregando comunicados…</div>;
  if (error) return <div className="text-red-400 text-center py-12">Erro: {error}</div>;

  return (
    <div className="space-y-4">

      <div>
        <h2 className="text-xl font-bold text-white">Comunicados</h2>
        <p className="text-sm text-gray-400 mt-1">Avisos e informativos do residencial</p>
      </div>

      {!comunicados || comunicados.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-gray-400">
          Nenhum comunicado no momento.
        </div>
      ) : (
        <div className="space-y-3">
          {comunicados.map((c) => {
            const style = TYPE_STYLE[c.type] ?? TYPE_STYLE.info;
            return (
              <div key={c._id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.badge}`}>
                    {style.label}
                  </span>
                  <span className="text-xs text-gray-500">{formatTimestamp(c.createdAt)}</span>
                </div>
                <h3 className="text-white font-medium">{c.title}</h3>
                <p className="text-sm text-gray-400 mt-2 whitespace-pre-wrap">{c.content}</p>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
