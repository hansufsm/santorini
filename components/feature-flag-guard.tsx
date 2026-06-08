"use client";

import { useFeatureFlags } from "@/lib/convex";

interface FeatureFlagGuardProps {
  flagKey: string;
  children: React.ReactNode;
}

export function FeatureFlagGuard({ flagKey, children }: FeatureFlagGuardProps) {
  const { isEnabled, loading } = useFeatureFlags();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-emerald-200/50 animate-pulse text-sm">Carregando permissões...</p>
      </div>
    );
  }

  if (!isEnabled(flagKey)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 bg-slate-900/40 border border-emerald-950/40 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="h-14 w-14 rounded-full bg-emerald-950/50 flex items-center justify-center text-emerald-400 border border-emerald-800/40 mb-4 animate-pulse">
          🔒
        </div>
        <h2 className="text-xl font-bold text-emerald-300">Funcionalidade Indisponível</h2>
        <p className="mt-2 text-sm text-emerald-200/60 max-w-md">
          Este módulo está temporariamente desativado pela administração ou em manutenção.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
