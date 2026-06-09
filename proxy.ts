// Proxy de autenticação do sistema Santorini
// Protege as rotas /portal/* e /admin/* verificando o cookie de sessão.
// Em Next.js 16, este arquivo substitui o antigo middleware.ts.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "santorini_session";

// Papéis com acesso ao painel administrativo
const ADMIN_ROLES = ["diretoria", "sysadmin"];
const PUBLIC_FILE = /\.(?:avif|gif|ico|jpg|jpeg|png|svg|webp|css|js|map|txt|xml|json)$/i;

// Mapa para controle de rate limiting (IP -> { cpfs: Set, resetTime: number })
const rateLimitMap = new Map<string, { cpfs: Set<string>; resetTime: number }>();

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isCpfRoute = /^\/\d{4}$/.test(pathname);

  // Aplica rate limiting se for a rota pública do CPF de 4 dígitos
  if (isCpfRoute) {
    const ip = request.ip || request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const cpfPrefix = pathname.substring(1);
    const now = Date.now();
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

    // 1. Verificar se a funcionalidade de extrato público está ativa no Convex
    let isPublicEnabled = true;
    if (convexUrl) {
      try {
        const res = await fetch(`${convexUrl}/api/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: "settings:getFlags",
            args: {},
          }),
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json();
          const flags = json.value as Record<string, boolean>;
          if (flags && flags.public_extratos_ativo === false) {
            isPublicEnabled = false;
          }
        }
      } catch (err) {
        console.error("Erro ao checar flag public_extratos_ativo:", err);
      }
    }

    if (!isPublicEnabled) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Serviço Indisponível - Santorini</title>
            <style>
              body {
                background-color: #020617;
                color: #cbd5e1;
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                padding: 24px;
              }
              .card {
                max-width: 400px;
                width: 100%;
                background-color: #0f172a;
                border: 1px solid rgba(239, 68, 68, 0.1);
                border-radius: 16px;
                padding: 32px;
                text-align: center;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
              }
              h1 {
                color: #f87171;
                font-size: 20px;
                margin-top: 0;
                margin-bottom: 12px;
              }
              p {
                font-size: 14px;
                line-height: 1.6;
                color: #94a3b8;
                margin-bottom: 0;
              }
              .badge {
                display: inline-block;
                background-color: rgba(239, 68, 68, 0.1);
                color: #f87171;
                font-size: 12px;
                font-weight: 600;
                padding: 6px 12px;
                border-radius: 20px;
                margin-bottom: 16px;
              }
            </style>
          </head>
          <body>
            <div class="card">
              <span style="font-size: 48px; display: block; margin-bottom: 16px;">🛡️</span>
              <div class="badge">Funcionalidade Suspensa</div>
              <h1>Serviço Temporariamente Indisponível</h1>
              <p>Por motivos de segurança, a consulta pública de extratos está temporariamente desativada. Se você for morador ou associado, acesse o Portal com sua senha para visualizar o extrato.</p>
            </div>
          </body>
        </html>`,
        {
          status: 503,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
          },
        }
      );
    }

    // Limpeza periódica simples para evitar vazamento de memória
    if (rateLimitMap.size > 1000) {
      for (const [key, val] of rateLimitMap.entries()) {
        if (now > val.resetTime) {
          rateLimitMap.delete(key);
        }
      }
    }

    let record = rateLimitMap.get(ip);
    if (!record) {
      record = {
        cpfs: new Set([cpfPrefix]),
        resetTime: now + 60000,
      };
      rateLimitMap.set(ip, record);
    } else {
      if (now > record.resetTime) {
        record.cpfs.clear();
        record.cpfs.add(cpfPrefix);
        record.resetTime = now + 60000;
      } else {
        record.cpfs.add(cpfPrefix);
        if (record.cpfs.size > 5) {
          // Registrar o bloqueio no Convex de forma síncrona para garantir entrega
          if (convexUrl) {
            try {
              await fetch(`${convexUrl}/api/mutation`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  path: "security:registerBlock",
                  args: { ip, details: `IP excedeu limite de consultas de CPFs diferentes. Tentou acessar: /${cpfPrefix}` },
                }),
              });
            } catch (err) {
              console.error("Erro ao registrar bloqueio de IP no Convex:", err);
            }
          }

          return new NextResponse(
            `<!DOCTYPE html>
            <html lang="pt-BR">
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Muitas Requisições - Santorini</title>
                <style>
                  body {
                    background-color: #020617;
                    color: #cbd5e1;
                    font-family: system-ui, -apple-system, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    padding: 24px;
                  }
                  .card {
                    max-width: 400px;
                    width: 100%;
                    background-color: #0f172a;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    border-radius: 16px;
                    padding: 32px;
                    text-align: center;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
                  }
                  h1 {
                    color: #f87171;
                    font-size: 24px;
                    margin-top: 0;
                    margin-bottom: 12px;
                  }
                  p {
                    font-size: 14px;
                    line-height: 1.6;
                    color: #94a3b8;
                    margin-bottom: 24px;
                  }
                  .badge {
                    display: inline-block;
                    background-color: rgba(239, 68, 68, 0.1);
                    color: #f87171;
                    font-size: 12px;
                    font-weight: 600;
                    padding: 6px 12px;
                    border-radius: 20px;
                    margin-bottom: 16px;
                  }
                </style>
              </head>
              <body>
                <div class="card">
                  <span style="font-size: 48px; display: block; margin-bottom: 16px;">🛡️</span>
                  <div class="badge">Limite de Segurança Excedido</div>
                  <h1>Muitas Requisições</h1>
                  <p>Por motivos de segurança, limitamos o número de consultas de extratos diferentes por minuto. Por favor, aguarde um momento antes de tentar novamente.</p>
                </div>
              </body>
            </html>`,
            {
              status: 429,
              headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Retry-After": "60",
              },
            }
          );
        }
      }
    }
  }

  // Rotas e assets públicos que nunca precisam de autenticação.
  const isPublic =
    pathname === "/" ||
    pathname === "/login" ||
    isCpfRoute || // Libera a rota de 4 dígitos do CPF na raiz (ex: /1234)
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname === "/favicon.ico" ||
    PUBLIC_FILE.test(pathname);

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
     * Arquivos públicos com extensão também são liberados pela regra isPublic acima.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
