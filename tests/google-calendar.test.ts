import assert from "node:assert/strict";
import test from "node:test";
import { deriveGoogleCalendarViewState } from "../lib/calendar/connection-state";
import { GOOGLE_CALENDAR_SCOPES } from "../lib/calendar/config";
import { normalizeGoogleEvent, refreshGoogleAccessToken, scopesAreExact } from "../lib/calendar/google";
import { isSupportedCalendarPlanningDate } from "../lib/calendar/day";

test("normalizes a Google timed event without exposing its raw ID", () => {
  const normalized = normalizeGoogleEvent({
    event: { id: "raw-google-event-id", summary: "Client meeting", location: "Studio", start: { dateTime: "2026-07-20T09:00:00-04:00" }, end: { dateTime: "2026-07-20T10:00:00-04:00" } },
    calendarId: "private-calendar-id",
    calendarName: "Work",
    hmacKey: "test-hmac-secret",
  });
  assert.ok(normalized);
  assert.notEqual(normalized.id, "raw-google-event-id");
  assert.equal(normalized.provider, "google");
  assert.equal(normalized.calendarName, "Work");
  assert.equal(normalized.isAllDay, false);
});

test("normalizes a Google all-day event using date boundaries", () => {
  const normalized = normalizeGoogleEvent({
    event: { id: "vacation", summary: "Vacation", start: { date: "2026-07-20" }, end: { date: "2026-07-21" } },
    calendarId: "primary",
    calendarName: "Personal",
    hmacKey: "test-hmac-secret",
  });
  assert.equal(normalized?.isAllDay, true);
  assert.equal(normalized?.startTime, "2026-07-20");
  assert.equal(normalized?.endTime, "2026-07-21");
});

test("refreshes a Google access token server-to-server", async () => {
  let submittedBody = "";
  const fetcher: typeof fetch = async (_input, init) => {
    submittedBody = String(init?.body || "");
    return new Response(JSON.stringify({ access_token: "new-access-token", expires_in: 3600, token_type: "Bearer" }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const token = await refreshGoogleAccessToken({ refreshToken: "private-refresh-token", clientId: "client", clientSecret: "secret" }, fetcher);
  assert.equal(token.access_token, "new-access-token");
  assert.match(submittedBody, /grant_type=refresh_token/);
  assert.match(submittedBody, /refresh_token=private-refresh-token/);
});

test("accepts only the exact narrow Google Calendar scopes", () => {
  assert.equal(scopesAreExact(GOOGLE_CALENDAR_SCOPES.join(" ")), true);
  assert.equal(scopesAreExact(`${GOOGLE_CALENDAR_SCOPES.join(" ")} https://www.googleapis.com/auth/calendar`), false);
  assert.equal(scopesAreExact(GOOGLE_CALENDAR_SCOPES[0]), false);
});

test("derives disconnected and expired connection states", () => {
  assert.equal(deriveGoogleCalendarViewState({ loading: false, configured: true }), "disconnected");
  assert.equal(deriveGoogleCalendarViewState({ loading: false, configured: true, status: "needs_reauth" }), "expired");
  assert.equal(deriveGoogleCalendarViewState({ loading: false, configured: true, status: "active", eventCount: 0 }), "empty");
  assert.equal(deriveGoogleCalendarViewState({ loading: false, configured: true, status: "active", eventCount: 2 }), "connected");
});

test("allows connected-calendar planning from today through one year ahead", () => {
  assert.equal(isSupportedCalendarPlanningDate("2026-07-12", "2026-07-12"), true);
  assert.equal(isSupportedCalendarPlanningDate("2027-07-12", "2026-07-12"), true);
  assert.equal(isSupportedCalendarPlanningDate("2026-07-11", "2026-07-12"), false);
  assert.equal(isSupportedCalendarPlanningDate("2027-07-13", "2026-07-12"), false);
  assert.equal(isSupportedCalendarPlanningDate("not-a-date", "2026-07-12"), false);
});
