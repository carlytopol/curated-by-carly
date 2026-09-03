import { requireCurrentUserId } from "@/lib/auth/require-current-user";
import { createIcsCalendarConnection, replaceIcsCalendarConnection } from "@/lib/calendar/connections";
import { dateInTimeZone, localDayUtcBounds } from "@/lib/calendar/day";
import { fetchIcsFeed, IcsFeedError, parseIcsEvents } from "@/lib/calendar/ics";
import { getUserProfile } from "@/lib/data/profile";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    enforceRateLimit(userId, "ics-calendar-connect", { limit: 8, windowMs: 10 * 60 * 1000 });
    const body = await request.json() as { url?: unknown; label?: unknown; connectionId?: unknown };
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const label = typeof body.label === "string" ? body.label.trim().slice(0, 120) : "Apple Calendar";
    const connectionId = typeof body.connectionId === "string" ? body.connectionId : null;
    if (!url || url.length > 2_048) return Response.json({ state: "invalid-link", error: "Enter a valid HTTPS iCal subscription URL." }, { status: 400 });
    const profile = await getUserProfile(userId);
    const timezone = profile.timezone || "UTC";
    const date = dateInTimeZone(new Date(), timezone);
    const bounds = localDayUtcBounds(date, timezone);
    const feed = await fetchIcsFeed(url);
    const hmacKey = process.env.CALENDAR_IDENTIFIER_HMAC_KEY;
    if (!hmacKey) throw new Error("calendar_identifier_key_missing");
    const events = parseIcsEvents({ body: feed, ...bounds, hmacKey, fallbackCalendarName: label });
    if (connectionId) await replaceIcsCalendarConnection({ userId, connectionId, subscriptionUrl: url, displayLabel: label || "Apple Calendar" });
    else await createIcsCalendarConnection({ userId, subscriptionUrl: url, displayLabel: label || "Apple Calendar" });
    return Response.json({ state: events.length ? "connected" : "empty-calendar", eventCount: events.length });
  } catch (error) {
    if (error instanceof IcsFeedError) {
      console.warn("ics_calendar_connect_failed", { code: error.code, message: error.message });
      const state = error.code === "invalid_link" || error.code === "invalid_feed" ? "invalid-link" : "unreachable-feed";
      return Response.json({ state, error: error.message }, { status: error.code === "unreachable_feed" ? 502 : 400 });
    }
    return Response.json({ state: "error", error: "The calendar subscription could not be saved." }, { status: 500 });
  }
}
