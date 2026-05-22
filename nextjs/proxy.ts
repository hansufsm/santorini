// Proxy de autenticação do sistema Santorini
// Protege as rotas /portal/* e /admin/* verificando o cookie de sessão.
// Em Next.js 16, este arquivo substitui o antigo middleware.ts.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "santorini_session";

// Papéis com acesso ao painel administrativo
const ADMIN_ROLES = ["diretoria", "sysadmin"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas que nunca precisam de autenticação (deixa passar direto)
  const isPublic =
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname === "/favicon.ico";

  if (isPublic) {
    return NextResponse.next();
  }

  // Tentar ler o cookie de sessão
  const cookieValue = request.cookies.get(COOKIE_NAME)?.value;

  let session: { role?: string } | null = null;
  if (cookieValue) {
    try {
      session = JSON.parse(decodeURIComponent(cookieValue));
    } catch {
      session = null;
    }
  }

  // Sem sessão válida → redirecionar para login
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Rota /admin/* exige papel diretoria ou sysadmin
  if (pathname.startsWith("/admin")) {
    if (!ADMIN_ROLES.includes(session.role ?? "")) {
      // Usuário autenticado mas sem permissão → manda para o portal
      const portalUrl = new URL("/portal/inicio", request.url);
      return NextResponse.redirect(portalUrl);
    }
  }

  // Rota /portal/* — qualquer papel autenticado tem acesso
  // (já verificamos que session != null acima)

  return NextResponse.next();
}

// Rotas em que o proxy deve ser executado
export const config = {
  matcher: [
    /*
     * Executa em todas as rotas exceto:
     * - _next/static  (arquivos estáticos compilados)
     * - _next/image   (otimização de imagens)
     * - favicon.ico   (ícone do site)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
