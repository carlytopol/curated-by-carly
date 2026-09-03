import { NextResponse, type NextRequest } from "next/server";
import { requireCurrentUserId } from "@/lib/auth/require-current-user";
import { createGoogleCalendarConnection } from "@/lib/calendar/connections";
import { getGoogleCalendarConfig, GOOGLE_CALENDAR_SCOPES } from "@/lib/calendar/config";
import { openCalendarTransaction } from "@/lib/calendar/crypto";
import { exchangeGoogleAuthorizationCode, scopesAreExact } from "@/lib/calendar/google";

export const runtime = "nodejs";
type OAuthTransaction = { state: string; verifier: string; userId: string; expiresAt: number };

function finish(request: NextRequest, result: "connected" | "denied" | "error", reason?: string) {
  const destination = new URL(`/today?calendar=${result}`, request.url);
  if (reason) destination.searchParams.set("calendar_reason", reason);
  const response = NextResponse.redirect(destination);
  response.cookies.set("curated_google_oauth", "", { path: "/api/calendar/callback/google", expires: new Date(0), httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  return response;
}

export async function GET(request: NextRequest) {
  let stage = "request_validation";
  try {
    if (request.nextUrl.searchParams.get("error")) return finish(request, "denied");
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const cookie = request.cookies.get("curated_google_oauth")?.value;
    if (!code || !state || !cookie) return finish(request, "error", "missing_transaction");
    stage = "transaction_decryption";
    const transaction = openCalendarTransaction<OAuthTransaction>(cookie);
    stage = "user_validation";
    const userId = await requireCurrentUserId();
    if (transaction.state !== state || transaction.userId !== userId || transaction.expiresAt < Date.now()) return finish(request, "error", "invalid_transaction");
    stage = "token_exchange";
    const config = getGoogleCalendarConfig();
    const tokens = await exchangeGoogleAuthorizationCode({ code, verifier: transaction.verifier, clientId: config.clientId, clientSecret: config.clientSecret, redirectUri: config.redirectUri });
    if (!tokens.refresh_token) return finish(request, "error", "missing_refresh_token");
    if (!scopesAreExact(tokens.scope)) return finish(request, "error", "scope_mismatch");
    stage = "connection_storage";
    await createGoogleCalendarConnection({
      userId,
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      expiresAt: new Date(Date.now() + Math.max(60, tokens.expires_in) * 1000).toISOString(),
      scopes: [...GOOGLE_CALENDAR_SCOPES],
    });
    return finish(request, "connected");
  } catch (error) {
    const errorCode = typeof error === "object" && error && "code" in error ? String(error.code) : undefined;
    console.error("google_calendar_callback_failed", { stage, errorName: error instanceof Error ? error.name : "UnknownError", errorCode });
    return finish(request, "error", stage);
  }
}
