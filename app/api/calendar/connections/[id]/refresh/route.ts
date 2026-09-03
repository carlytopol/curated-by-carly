import { requireCurrentUserId } from "@/lib/auth/require-current-user";
import { getIcsSubscriptionUrl, markCalendarConnectionError, markCalendarSynced, requireOwnedConnection } from "@/lib/calendar/connections";
import { dateInTimeZone, localDayUtcBounds } from "@/lib/calendar/day";
import { fetchIcsFeed, IcsFeedError, parseIcsEvents } from "@/lib/calendar/ics";
import { getUserProfile } from "@/lib/data/profile";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await requireCurrentUserId();
  const { id } = await context.params;
  try {
    enforceRateLimit(userId, "ics-calendar-refresh", { limit: 15, windowMs: 10 * 60 * 1000 });
    const connection = await requireOwnedConnection(userId, id);
    if (connection.provider !== "ics") return Response.json({ state: "error", error: "This is not an iCal connection." }, { status: 400 });
    const profile = await getUserProfile(userId);
    const timezone = profile.timezone || "UTC";
    const bounds = localDayUtcBounds(dateInTimeZone(new Date(), timezone), timezone);
    const feed = await fetchIcsFeed(await getIcsSubscriptionUrl(userId, id));
    const hmacKey = process.env.CALENDAR_IDENTIFIER_HMAC_KEY;
    if (!hmacKey) throw new Error("calendar_identifier_key_missing");
    const events = parseIcsEvents({ body: feed, ...bounds, hmacKey, fallbackCalendarName: connection.displayLabel });
    await markCalendarSynced(userId, id);
    return Response.json({ state: events.length ? "connected" : "empty-calendar", eventCount: events.length });
  } catch (error) {
    if (error instanceof IcsFeedError) {
      const status = error.code === "unreachable_feed" ? "unreachable_feed" : "invalid_link";
      await markCalendarConnectionError(userId, id, status, error.code);
      return Response.json({ state: status.replaceAll("_", "-"), error: error.message }, { status: status === "unreachable_feed" ? 502 : 400 });
    }
    await markCalendarConnectionError(userId, id, "error", "refresh_failed").catch(() => undefined);
    return Response.json({ state: "error", error: "The calendar feed could not be refreshed." }, { status: 500 });
  }
}
