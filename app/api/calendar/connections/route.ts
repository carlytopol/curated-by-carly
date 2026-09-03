import { requireCurrentUserId } from "@/lib/auth/require-current-user";
import { isGoogleCalendarConfigured } from "@/lib/calendar/config";
import { listCalendarConnections } from "@/lib/calendar/connections";

export async function GET() {
  try {
    const connections = await listCalendarConnections(await requireCurrentUserId());
    return Response.json({ configured: isGoogleCalendarConfigured(), icsConfigured: Boolean(process.env.CALENDAR_TOKEN_ENCRYPTION_KEY_V1 && process.env.CALENDAR_IDENTIFIER_HMAC_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY), connections }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ configured: isGoogleCalendarConfigured(), icsConfigured: Boolean(process.env.CALENDAR_TOKEN_ENCRYPTION_KEY_V1 && process.env.CALENDAR_IDENTIFIER_HMAC_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY), connections: [], error: "We could not open calendar connections." }, { status: 500 });
  }
}
