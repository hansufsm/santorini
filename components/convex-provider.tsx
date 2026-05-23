// Componente cliente que conecta o app ao Convex
"use client";

import { useState } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Instância criada dentro do componente (e não no módulo) para evitar
  // falha no build quando NEXT_PUBLIC_CONVEX_URL não está definida.
  const [convex] = useState(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    return url ? new ConvexReactClient(url) : null;
  });

  if (!convex) return <>{children}</>;
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
