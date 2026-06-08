// lib/convex.ts — Helpers para chamar o backend Convex
// Usamos fetch direto pois os tipos gerados pelo 'npx convex dev' não estão no repo.
"use client";

import { useState, useEffect } from "react";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

// Executa uma query do Convex (leitura de dados)
export async function convexQuery<T = unknown>(
  path: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  if (!CONVEX_URL) throw new Error("NEXT_PUBLIC_CONVEX_URL não configurada.");
  const res = await fetch(`${CONVEX_URL}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, args }),
  });
  if (!res.ok) throw new Error(`Erro ao consultar ${path}: ${res.statusText}`);
  const json = await res.json();
  return json.value as T;
}

// Executa uma mutation do Convex (escrita de dados)
export async function convexMutation<T = unknown>(
  path: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  if (!CONVEX_URL) throw new Error("NEXT_PUBLIC_CONVEX_URL não configurada.");
  const res = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, args }),
  });
  if (!res.ok) throw new Error(`Erro ao executar ${path}: ${res.statusText}`);
  const json = await res.json();
  return json.value as T;
}

// Hook React para buscar dados do Convex e atualizar quando args mudam
export function useConvexQuery<T = unknown>(
  path: string,
  args: Record<string, unknown> = {},
  // skip=true evita fazer a query (ex: quando ainda não tem a sessão carregada)
  skip = false
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState<string | null>(null);

  // Serializar args para detectar mudanças de valor
  const argsKey = JSON.stringify(args);

  useEffect(() => {
    if (skip) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    convexQuery<T>(path, args)
      .then((result) => {
        if (!cancelled) { setData(result); setLoading(false); }
      })
      .catch((err: Error) => {
        if (!cancelled) { setError(err.message); setLoading(false); }
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, argsKey, skip]);

  function reload() {
    if (skip) return;
    setLoading(true);
    convexQuery<T>(path, args)
      .then((result) => { setData(result); setLoading(false); })
      .catch((err: Error) => { setError(err.message); setLoading(false); });
  }

  return { data, loading, error, reload };
}

// Hook para consumir as Feature Flags globais do sistema
export function useFeatureFlags() {
  const { data: flags, loading } = useConvexQuery<Record<string, boolean>>(
    "settings:getFlags",
    {}
  );

  function isEnabled(key: string): boolean {
    if (loading || !flags) return true; // Fallback seguro (ativo por padrão enquanto carrega)
    return !!flags[key];
  }

  return { isEnabled, loading, flags };
}

