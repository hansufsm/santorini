// Contexto de autenticação do sistema Santorini
// Armazena a sessão do usuário em cookie (JSON) com validade de 8 horas.
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type SessionData = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  unit: string;
  role: "sysadmin" | "diretoria" | "associado" | "morador";
  status: string;
  associateId?: string;
  joinedAt: string;
  cpfPrefix: string;
  token: string;
};

type AuthContextType = {
  session: SessionData | null;
  loading: boolean;
  logout: () => void;
};

const SESSION_CHANGED_EVENT = "santorini-session-changed";

// ─── Nome do cookie ───────────────────────────────────────────────────────────

const COOKIE_NAME = "santorini_session";
// 8 horas em segundos
const COOKIE_MAX_AGE = 8 * 60 * 60;

// ─── Helpers de cookie ────────────────────────────────────────────────────────

/**
 * Lê e parseia o JSON do cookie de sessão.
 * Retorna null se o cookie não existir ou for inválido.
 */
export function getSessionCookie(): SessionData | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, ...rest] = cookie.trim().split("=");
    if (name === COOKIE_NAME) {
      try {
        const value = decodeURIComponent(rest.join("="));
        return JSON.parse(value) as SessionData;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Grava os dados de sessão no cookie como JSON.
 * Expira em 8 horas.
 */
export function setSessionCookie(data: SessionData): void {
  if (typeof document === "undefined") return;

  const value = encodeURIComponent(JSON.stringify(data));
  document.cookie = `${COOKIE_NAME}=${value}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent<SessionData>(SESSION_CHANGED_EVENT, { detail: data }));
}

/**
 * Remove o cookie de sessão.
 */
export function clearSessionCookie(): void {
  if (typeof document === "undefined") return;

  document.cookie = `${COOKIE_NAME}=; max-age=0; path=/; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent<SessionData | null>(SESSION_CHANGED_EVENT, { detail: null }));
}

// ─── Contexto ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  logout: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  // Ao montar, lê o cookie para restaurar a sessão e escuta mudanças feitas no login.
  useEffect(() => {
    const stored = getSessionCookie();
    setSession(stored);
    setLoading(false);

    function handleSessionChanged(event: Event) {
      const customEvent = event as CustomEvent<SessionData | null>;
      setSession(customEvent.detail ?? getSessionCookie());
      setLoading(false);
    }

    window.addEventListener(SESSION_CHANGED_EVENT, handleSessionChanged);
    return () => window.removeEventListener(SESSION_CHANGED_EVENT, handleSessionChanged);
  }, []);

  // Remove a sessão tanto do estado quanto do cookie
  function logout() {
    clearSessionCookie();
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook para acessar o contexto de autenticação em qualquer componente cliente.
 * Uso: const { session, loading, logout } = useAuth();
 */
export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
