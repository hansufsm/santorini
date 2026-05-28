import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_PCLOUD_CLIENT_ID = "9uBhtzMOviR";
const DEFAULT_PCLOUD_REDIRECT_URI = "https://santorni.org.br/api/pcloud-oauth/callback";

export async function GET(request: NextRequest) {
  const clientId = process.env.PCLOUD_CLIENT_ID || DEFAULT_PCLOUD_CLIENT_ID;
  const redirectUri = process.env.PCLOUD_REDIRECT_URI || DEFAULT_PCLOUD_REDIRECT_URI;
  const state = randomBytes(24).toString("hex");
  const forceReapprove = request.nextUrl.searchParams.get("force") === "1";

  const authorizationUrl = new URL("https://my.pcloud.com/oauth2/authorize");
  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("state", state);
  if (forceReapprove) authorizationUrl.searchParams.set("force_reapprove", "1");

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set("pcloud_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 10 * 60,
  });
  return response;
}
