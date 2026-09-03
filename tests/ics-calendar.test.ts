import assert from "node:assert/strict";
import test from "node:test";
import { assertSafeIcsRedirect, assertSafeIcsUrl, assertValidIcsContent, disconnectBehaviorForProvider, ICS_FETCH_LIMITS, IcsFeedError, isBlockedIp, parseIcsEvents, selectPublicAddress } from "../lib/calendar/ics";

const header = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Curated Test//EN\r\nX-WR-CALNAME:Family Calendar\r\n";
const footer = "END:VCALENDAR\r\n";
const window = { timeMin: "2026-07-13T00:00:00.000Z", timeMax: "2026-07-14T00:00:00.000Z", hmacKey: "test-hmac-key" };

test("parses minimal timed and all-day iCal events", () => {
  const body = `${header}BEGIN:VEVENT\r\nUID:timed-1\r\nDTSTAMP:20260701T000000Z\r\nSUMMARY:Dinner\r\nLOCATION:Garden Room\r\nDTSTART:20260713T180000Z\r\nDTEND:20260713T200000Z\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:all-day-1\r\nDTSTAMP:20260701T000000Z\r\nSUMMARY:Vacation\r\nDTSTART;VALUE=DATE:20260713\r\nDTEND;VALUE=DATE:20260714\r\nEND:VEVENT\r\n${footer}`;
  const events = parseIcsEvents({ body, ...window });
  assert.equal(events.length, 2);
  assert.equal(events[0].calendarName, "Family Calendar");
  assert.equal(events[0].provider, "ics");
  assert.equal(events[1].isAllDay, false);
  assert.equal(events.some((event) => event.isAllDay && event.title === "Vacation"), true);
});

test("expands recurring events and applies timezone offsets", () => {
  const body = `${header}BEGIN:VEVENT\r\nUID:recurring-1\r\nDTSTAMP:20260701T000000Z\r\nSUMMARY:Morning meeting\r\nDTSTART;TZID=America/New_York:20260712T090000\r\nDTEND;TZID=America/New_York:20260712T100000\r\nRRULE:FREQ=DAILY;COUNT=3\r\nEND:VEVENT\r\n${footer}`;
  const events = parseIcsEvents({ body, ...window });
  assert.equal(events.length, 1);
  assert.equal(events[0].startTime, "2026-07-13T13:00:00.000Z");
});

test("honors recurrence overrides and cancellations", () => {
  const body = `${header}BEGIN:VEVENT\r\nUID:series-1\r\nDTSTAMP:20260701T000000Z\r\nSUMMARY:Original title\r\nDTSTART:20260712T150000Z\r\nDTEND:20260712T160000Z\r\nRRULE:FREQ=DAILY;COUNT=3\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:series-1\r\nDTSTAMP:20260702T000000Z\r\nRECURRENCE-ID:20260713T150000Z\r\nSUMMARY:Updated title\r\nDTSTART:20260713T170000Z\r\nDTEND:20260713T180000Z\r\nSEQUENCE:2\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:cancelled-1\r\nDTSTAMP:20260701T000000Z\r\nSTATUS:CANCELLED\r\nSUMMARY:Cancelled dinner\r\nDTSTART:20260713T190000Z\r\nDTEND:20260713T200000Z\r\nEND:VEVENT\r\n${footer}`;
  const events = parseIcsEvents({ body, ...window });
  assert.equal(events.some((event) => event.title === "Cancelled dinner"), false);
  assert.equal(events.some((event) => event.title === "Updated title" && event.startTime === "2026-07-13T17:00:00.000Z"), true);
  assert.equal(events.some((event) => event.title === "Original title" && event.startTime === "2026-07-13T15:00:00.000Z"), false);
});

test("rejects malformed calendar content", () => {
  assert.throws(() => assertValidIcsContent("<html>not a calendar</html>"), (error) => error instanceof IcsFeedError && error.code === "invalid_feed");
});

test("enforces HTTPS and blocks private network targets", () => {
  assert.throws(() => assertSafeIcsUrl("http://example.com/calendar.ics"), IcsFeedError);
  assert.throws(() => assertSafeIcsUrl("https://127.0.0.1/calendar.ics"), IcsFeedError);
  assert.throws(() => assertSafeIcsUrl("https://[::1]/calendar.ics"), IcsFeedError);
  assert.equal(isBlockedIp("10.2.3.4"), true);
  assert.equal(isBlockedIp("169.254.1.2"), true);
  assert.equal(isBlockedIp("8.8.8.8"), false);
  assert.deepEqual(
    selectPublicAddress([{ address: "2606:4700:4700::1111", family: 6 }, { address: "1.1.1.1", family: 4 }]),
    { address: "1.1.1.1", family: 4 },
  );
  assert.throws(() => selectPublicAddress([{ address: "1.1.1.1", family: 4 }, { address: "127.0.0.1", family: 4 }]), IcsFeedError);
  assert.equal(assertSafeIcsUrl("https://example.com/calendar.ics").protocol, "https:");
  assert.throws(() => assertSafeIcsRedirect(new URL("https://example.com/a.ics"), "http://example.com/b.ics", 2), IcsFeedError);
  assert.throws(() => assertSafeIcsRedirect(new URL("https://example.com/a.ics"), "https://127.0.0.1/b.ics", 2), IcsFeedError);
  assert.throws(() => assertSafeIcsRedirect(new URL("https://example.com/a.ics"), "/b.ics", 0), IcsFeedError);
  assert.equal(ICS_FETCH_LIMITS.timeoutMs, 12_000);
  assert.equal(ICS_FETCH_LIMITS.maxRedirects, 5);
  assert.throws(() => assertValidIcsContent(`${header}${"X".repeat(ICS_FETCH_LIMITS.maxBytes)}${footer}`), IcsFeedError);
});

test("ICS disconnect deletes local credentials without remote revocation", () => {
  assert.deepEqual(disconnectBehaviorForProvider("ics"), { revokeRemoteToken: false, deleteLocalCredentials: true });
  assert.deepEqual(disconnectBehaviorForProvider("google"), { revokeRemoteToken: true, deleteLocalCredentials: true });
});
