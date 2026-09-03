import { requireCurrentUserId } from "@/lib/auth/require-current-user";
import { buildDailyAgendaFromCalendarEvents } from "@/lib/daily-agenda/calendar-events";
import { getGoogleAccessToken, getIcsSubscriptionUrl, listCalendarConnections, markCalendarConnectionError, markCalendarSynced, requireOwnedConnection } from "@/lib/calendar/connections";
import { dateInTimeZone, isSupportedCalendarPlanningDate, localDayUtcBounds } from "@/lib/calendar/day";
import { listGoogleCalendars, listGoogleEventsForDay } from "@/lib/calendar/google";
import { fetchIcsFeed, IcsFeedError, parseIcsEvents } from "@/lib/calendar/ics";
import { getUserProfile } from "@/lib/data/profile";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    const profile = await getUserProfile(userId);
    const requestedTimezone = new URL(request.url).searchParams.get("timezone");
    let fallbackTimezone = "UTC";
    if (requestedTimezone) {
      try { new Intl.DateTimeFormat("en-US", { timeZone: requestedTimezone }).format(); fallbackTimezone = requestedTimezone; } catch { /* Use UTC. */ }
    }
    const timezone = profile.timezone || fallbackTimezone;
    const today = dateInTimeZone(new Date(), timezone);
    const requestedDate = new URL(request.url).searchParams.get("date") || today;
    if (!isSupportedCalendarPlanningDate(requestedDate, today)) return Response.json({ error: "Choose a date between today and one year from today." }, { status: 400 });
    const bounds = localDayUtcBounds(requestedDate, timezone);
    const connections = await listCalendarConnections(userId);
    const events: import("@/types/calendar").CalendarEvent[] = [];
    const states: Array<{ id: string; provider: string; status: string; error?: string }> = [];
    const hmacKey = process.env.CALENDAR_IDENTIFIER_HMAC_KEY;
    if (!hmacKey) return Response.json({ error: "Calendar integrations are not configured." }, { status: 503 });
    for (const connection of connections) {
      if (connection.status !== "active") { states.push({ id: connection.id, provider: connection.provider, status: connection.status }); continue; }
      try {
        if (connection.provider === "google") {
          const accessToken = await getGoogleAccessToken(userId, connection.id);
          const calendars = await listGoogleCalendars(accessToken);
          const eventGroups = await Promise.all(calendars.slice(0, 50).map((calendar) => listGoogleEventsForDay({
            accessToken, calendarId: calendar.id!, calendarName: calendar.summary || "Google Calendar", ...bounds, hmacKey,
          })));
          events.push(...eventGroups.flat());
        } else {
          const feed = await fetchIcsFeed(await getIcsSubscriptionUrl(userId, connection.id));
          events.push(...parseIcsEvents({ body: feed, ...bounds, hmacKey, fallbackCalendarName: connection.displayLabel }));
        }
        await markCalendarSynced(userId, connection.id);
        states.push({ id: connection.id, provider: connection.provider, status: "active" });
      } catch (error) {
        if (connection.provider === "ics" && error instanceof IcsFeedError) {
          const status = error.code === "unreachable_feed" ? "unreachable_feed" : "invalid_link";
          await markCalendarConnectionError(userId, connection.id, status, error.code).catch(() => undefined);
        }
        const latest = await requireOwnedConnection(userId, connection.id).catch(() => null);
        states.push({ id: connection.id, provider: connection.provider, status: latest?.status || "error", error: latest?.status === "needs_reauth" ? undefined : "Calendar events are temporarily unavailable." });
      }
    }
    const agenda = buildDailyAgendaFromCalendarEvents({ id: `agenda-${requestedDate}`, date: requestedDate, timezone, events, generatedAt: new Date().toISOString() });
    return Response.json({ agenda, connections: states }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "We could not prepare the selected day’s agenda." }, { status: 500 });
  }
}
