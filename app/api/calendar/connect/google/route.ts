import { randomBytes } from "node:crypto";
import { requireCurrentUserId } from "@/lib/auth/require-current-user";
import { getGoogleCalendarConfig, isGoogleCalendarConfigured } from "@/lib/calendar/config";
import { sealCalendarTransaction } from "@/lib/calendar/crypto";
import { createGoogleAuthorizationUrl, createPkcePair } from "@/lib/calendar/google";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST() {
  try {
    const userId = await requireCurrentUserId();
    enforceRateLimit(userId, "google-calendar-connect", { limit: 5, windowMs: 10 * 60 * 1000 });
    if (!isGoogleCalendarConfigured()) return Response.json({ error: "Google Calendar connection is not configured yet." }, { status: 503 });
    const config = getGoogleCalendarConfig();
    const state = randomBytes(32).toString("base64url");
    const { verifier, challenge } = createPkcePair();
    const transaction = sealCalendarTransaction({ state, verifier, userId, expiresAt: Date.now() + 15 * 60 * 1000 });
    const response = Response.json({ authorizationUrl: createGoogleAuthorizationUrl({ clientId: config.clientId, redirectUri: config.redirectUri, state, challenge }) });
    response.headers.append("Set-Cookie", `curated_google_oauth=${transaction}; Path=/api/calendar/callback/google; HttpOnly; SameSite=Lax; Max-Age=900${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return Response.json({ error: "We could not begin the Google Calendar connection." }, { status: 500 });
  }
}
