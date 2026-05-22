/**
 * login/page.tsx — Página de login unificado
 *
 * Duas abas:
 *   - "Associado / Morador": login com CPF (11 dígitos)
 *   - "Diretoria / Admin": login com email + senha
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setSessionCookie, type SessionData } from "@/lib/auth";

// URL do Convex — vem do .env.local
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

// ─── Helper: chamar mutation Convex via HTTP ──────────────────────────────────

async function convexMutation(path: string, args: Record<string, unknown>) {
  const res = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, args, format: "json" }),
  });
  if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
  const json = await res.json();
  // Convex retorna { value: ... } para resultado bem-sucedido
  if (json.status === "error") throw new Error(json.errorMessage || "Erro desconhecido");
  return json.value;
}

// ─── Helper: gerar SHA-256 da senha ──────────────────────────────────────────

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Helper: formatar CPF enquanto o usuário digita ─────────────────────────

function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2");
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function LoginPage() {
  // Qual aba está ativa: "cpf" ou "senha"
  const [tab, setTab] = useState<"cpf" | "senha">("cpf");

  // Campos do formulário
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Estado da requisição
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();

  // ─── Login com CPF ───────────────────────────────────────────────────────────

  async function handleCpfLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await convexMutation("auth:loginWithCpf", { cpf });

      if (!result.success) {
        setError(result.error || "CPF não encontrado.");
        return;
      }

      // Salvar sessão no cookie
      const session: SessionData = { ...result.user, token: result.token };
      setSessionCookie(session);

      // Redirecionar conforme papel
      router.push("/portal/inicio");
    } catch (err) {
      setError("Erro ao conectar. Tente novamente.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // ─── Login com email + senha ─────────────────────────────────────────────────

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Nunca enviar a senha em texto puro — enviar o hash SHA-256
      const passwordHash = await sha256(password);

      const result = await convexMutation("auth:loginWithPassword", {
        email,
        passwordHash,
      });

      if (!result.success) {
        setError(result.error || "Credenciais inválidas.");
        return;
      }

      // Salvar sessão no cookie
      const session: SessionData = { ...result.user, token: result.token };
      setSessionCookie(session);

      // Diretoria e Sysadmin vão para o painel admin
      router.push("/admin");
    } catch (err) {
      setError("Erro ao conectar. Tente novamente.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏖️</div>
          <h1 className="text-xl font-bold text-white">AMRTS Santorini</h1>
          <p className="text-sm text-gray-400 mt-1">Acesse sua área</p>
        </div>

        {/* Card do formulário */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">

          {/* Seletor de aba */}
          <div className="flex gap-1 mb-6 bg-gray-800 rounded-lg p-1">
            <button
              type="button"
              onClick={() => { setTab("cpf"); setError(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === "cpf"
                  ? "bg-emerald-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Associado / Morador
            </button>
            <button
              type="button"
              onClick={() => { setTab("senha"); setError(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === "senha"
                  ? "bg-emerald-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Diretoria / Admin
            </button>
          </div>

          {/* ─── Formulário CPF ─── */}
          {tab === "cpf" && (
            <form onSubmit={handleCpfLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Seu CPF
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  maxLength={14}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-lg tracking-widest"
                />
              </div>
              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {loading ? "Verificando…" : "Acessar minha área →"}
              </button>
            </form>
          )}

          {/* ─── Formulário email + senha ─── */}
          {tab === "senha" && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {loading ? "Verificando…" : "Entrar →"}
              </button>
            </form>
          )}
        </div>

        {/* Nota de rodapé */}
        <p className="text-center text-xs text-gray-500 mt-6">
          Problemas para acessar? Contate a administração.
        </p>
      </div>
    </div>
  );
}
