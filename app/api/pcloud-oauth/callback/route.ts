import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_PCLOUD_CLIENT_ID = "9uBhtzMOviR";

function normalizePCloudHost(value: string | undefined | null) {
  const host = (value || "api.pcloud.com").trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!/^(api|eapi)\.pcloud\.com$/i.test(host)) return "api.pcloud.com";
  return host.toLowerCase();
}

function htmlPage(title: string, body: string, status = 200) {
  return new NextResponse(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { background: #020617; color: #e5e7eb; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 32px; }
    main { max-width: 760px; margin: 0 auto; border: 1px solid #1f2937; background: #111827; border-radius: 20px; padding: 28px; }
    h1 { color: #f9fafb; margin-top: 0; }
    p { color: #cbd5e1; line-height: 1.65; }
    code { background: #020617; border: 1px solid #334155; border-radius: 8px; padding: 2px 6px; }
    a { color: #34d399; }
  </style>
</head>
<body><main>${body}</main></body>
</html>`, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const error = searchParams.get("error");
  if (error) {
    return htmlPage(
      "Autorização pCloud recusada",
      `<h1>Autorização não concluída</h1><p>O pCloud retornou: <code>${error}</code>.</p><p>Você pode voltar ao painel de transações e tentar novamente.</p>`,
      400
    );
  }

  const code = searchParams.get("code") || "";
  const state = searchParams.get("state") || "";
  const hostname = normalizePCloudHost(searchParams.get("hostname"));
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("pcloud_oauth_state")?.value;

  if (!code) {
    return htmlPage("Código pCloud ausente", "<h1>Código de autorização ausente</h1><p>O pCloud não retornou o parâmetro <code>code</code>. Inicie a autorização novamente pelo painel.</p>", 400);
  }
  if (expectedState && expectedState !== state) {
    return htmlPage("Validação pCloud falhou", "<h1>Validação de segurança falhou</h1><p>O parâmetro <code>state</code> não corresponde ao início da autorização. Inicie a autorização novamente pelo painel.</p>", 400);
  }

  const clientId = process.env.PCLOUD_CLIENT_ID || DEFAULT_PCLOUD_CLIENT_ID;
  const clientSecret = process.env.PCLOUD_CLIENT_SECRET || "";
  if (!clientSecret) {
    return htmlPage(
      "PCLOUD_CLIENT_SECRET ausente",
      "<h1>Configuração incompleta</h1><p>A Redirect URI está correta, mas a variável de ambiente <code>PCLOUD_CLIENT_SECRET</code> ainda não está configurada no deploy. Configure o segredo na Vercel e tente autorizar novamente.</p>",
      500
    );
  }

  const tokenUrl = new URL(`https://${hostname}/oauth2_token`);
  tokenUrl.searchParams.set("client_id", clientId);
  tokenUrl.searchParams.set("client_secret", clientSecret);
  tokenUrl.searchParams.set("code", code);

  const tokenResponse = await fetch(tokenUrl, { cache: "no-store" });
  const tokenData = await tokenResponse.json().catch(() => ({})) as { result?: number; access_token?: string; token_type?: string; uid?: number; error?: string };
  if (!tokenResponse.ok || tokenData.result !== 0 || !tokenData.access_token) {
    return htmlPage(
      "Falha ao conectar pCloud",
      `<h1>Não foi possível obter o token</h1><p>O pCloud retornou: <code>${tokenData.error || `HTTP ${tokenResponse.status}`}</code>.</p>`,
      400
    );
  }

  const response = htmlPage(
    "pCloud conectado",
    `<h1>pCloud conectado com sucesso</h1><p>A conta foi autorizada e um token temporário foi salvo em cookie seguro para este navegador.</p><p>Para uso estável em produção, copie o token do painel do pCloud ou gere um token administrativo e configure-o na Vercel como <code>PCLOUD_ACCESS_TOKEN</code>. Configure também <code>PCLOUD_API_HOST=${hostname}</code> e <code>PCLOUD_FOLDER_ID</code> com o identificador da pasta dos CSVs.</p><p>Agora você pode voltar para <a href="/admin/transacoes">Admin → Transações</a> e usar a opção <strong>API pCloud autenticada</strong>.</p>`
  );

  response.cookies.set("pcloud_access_token", tokenData.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  response.cookies.set("pcloud_api_host", hostname, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  response.cookies.delete("pcloud_oauth_state");
  return response;
}
