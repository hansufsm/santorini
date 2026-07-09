"use client";

import { useState } from "react";

export default function GuiaIndicacoesAdminPage() {
  const [loading, setLoading] = useState(true);

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Guia de Indicações</h2>
          <p className="text-sm text-gray-400 mt-1">
            Visualização do guia de profissionais e parceiros cadastrados.
          </p>
        </div>
        <div className="text-xs bg-emerald-950/40 border border-emerald-900/30 text-emerald-300 px-3 py-1.5 rounded-xl self-start md:self-center">
          ✨ Elaborado pelo morador <strong>Fellipe Mello</strong>
        </div>
      </div>

      <div className="relative flex-1 min-h-[500px] bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl shadow-black/30">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10 space-y-3">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-400 font-medium">Carregando guia de indicações...</p>
          </div>
        )}
        <iframe
          src="https://filedn.com/lzMfmyW5BK1YhaV0f4rLG2J/guia-indicacoes-santorini.html"
          className="w-full h-full border-0 rounded-2xl bg-white"
          onLoad={() => setLoading(false)}
          title="Guia de Indicações Santorini"
        />
      </div>
    </div>
  );
}
