import assert from "node:assert/strict";
import test from "node:test";
import { buildDailyAgendaFromCalendarEvents, mapCalendarEventToDailyAgendaItem } from "../lib/daily-agenda/calendar-events";
import type { CalendarEvent } from "../types/calendar";

function calendarEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "event-1",
    title: "Untitled event",
    startTime: "2026-07-20T09:00:00-04:00",
    endTime: "2026-07-20T10:00:00-04:00",
    location: null,
    provider: "google",
    calendarName: "Work",
    isAllDay: false,
    ...overrides,
  };
}

test("classifies a work meeting with professional formality", () => {
  const item = mapCalendarEventToDailyAgendaItem(calendarEvent({ title: "Board presentation" }));
  assert.equal(item.occasionClassification.kind, "meeting");
  assert.equal(item.occasionClassification.occasion, "Professional meeting");
  assert.equal(item.occasionClassification.confidence, "high");
  assert.equal(item.dressCodeInference.dressCode, "professional");
  assert.equal(item.isReadOnly, true);
});

test("classifies a dinner without overstating its dress code", () => {
  const item = mapCalendarEventToDailyAgendaItem(calendarEvent({ title: "Dinner at Balthazar", location: "SoHo" }));
  assert.equal(item.occasionClassification.kind, "dinner");
  assert.equal(item.dressCodeInference.dressCode, "elevated casual");
  assert.equal(item.dressCodeInference.confidence, "low");
});

test("classifies a workout and requires activewear", () => {
  const item = mapCalendarEventToDailyAgendaItem(calendarEvent({ title: "Tennis workout" }));
  assert.equal(item.occasionClassification.kind, "workout");
  assert.equal(item.dressCodeInference.dressCode, "activewear");
  assert.equal(item.dressCodeInference.confidence, "high");
});

test("does not mistake ordinary work or errands language for exercise", () => {
  for (const title of [
    "Running errands and working around the house",
    "Working from home",
    "Working around the house",
    "Running a business from home",
  ]) {
    const item = mapCalendarEventToDailyAgendaItem(calendarEvent({ title }));
    assert.notEqual(item.occasionClassification.kind, "workout", title);
    assert.notEqual(item.dressCodeInference.dressCode, "activewear", title);
  }
});

test("retains exercise classification when ordinary errands also mention a real workout", () => {
  const item = mapCalendarEventToDailyAgendaItem(calendarEvent({ title: "Running errands after a tennis workout" }));
  assert.equal(item.occasionClassification.kind, "workout");
  assert.equal(item.dressCodeInference.dressCode, "activewear");
});

test("classifies a flight as practical travel context", () => {
  const item = mapCalendarEventToDailyAgendaItem(calendarEvent({ title: "AA 123 flight to London", location: "JFK Terminal 8" }));
  assert.equal(item.occasionClassification.kind, "flight");
  assert.equal(item.occasionClassification.occasion, "Air travel");
  assert.equal(item.dressCodeInference.dressCode, "comfortable travel layers");
});

test("classifies a wedding while honoring an explicit dress code", () => {
  const item = mapCalendarEventToDailyAgendaItem(calendarEvent({ title: "Black tie wedding" }));
  assert.equal(item.occasionClassification.kind, "wedding");
  assert.equal(item.dressCodeInference.dressCode, "black tie");
  assert.equal(item.dressCodeInference.confidence, "high");
});

test("preserves an all-day event and sorts it before timed events", () => {
  const agenda = buildDailyAgendaFromCalendarEvents({
    id: "agenda-1",
    date: "2026-07-20",
    timezone: "America/New_York",
    generatedAt: "2026-07-20T07:00:00-04:00",
    events: [
      calendarEvent({ id: "timed", title: "Dinner", startTime: "2026-07-20T19:00:00-04:00", endTime: "2026-07-20T21:00:00-04:00" }),
      calendarEvent({ id: "all-day", title: "Personal day", startTime: "2026-07-20", endTime: "2026-07-21", isAllDay: true }),
    ],
  });
  assert.equal(agenda.items[0].id, "all-day");
  assert.equal(agenda.items[0].isAllDay, true);
  assert.equal(agenda.items[0].occasionClassification.occasion, "All-day commitment");
  assert.equal(agenda.items[0].hasTimeConflict, false);
});

test("annotates overlapping timed events without treating adjacent events as conflicts", () => {
  const agenda = buildDailyAgendaFromCalendarEvents({
    id: "agenda-overlap",
    date: "2026-07-20",
    timezone: "America/New_York",
    generatedAt: "2026-07-20T07:00:00-04:00",
    events: [
      calendarEvent({ id: "meeting-a", title: "Client meeting", startTime: "2026-07-20T09:00:00-04:00", endTime: "2026-07-20T10:00:00-04:00" }),
      calendarEvent({ id: "meeting-b", title: "Team sync", startTime: "2026-07-20T09:30:00-04:00", endTime: "2026-07-20T11:00:00-04:00" }),
      calendarEvent({ id: "meeting-c", title: "Project call", startTime: "2026-07-20T11:00:00-04:00", endTime: "2026-07-20T12:00:00-04:00" }),
    ],
  });
  const first = agenda.items.find((item) => item.id === "meeting-a");
  const second = agenda.items.find((item) => item.id === "meeting-b");
  const adjacent = agenda.items.find((item) => item.id === "meeting-c");
  assert.deepEqual(first?.overlapsWithItemIds, ["meeting-b"]);
  assert.deepEqual(second?.overlapsWithItemIds, ["meeting-a"]);
  assert.equal(adjacent?.hasTimeConflict, false);
});

test("preserves explicit user corrections with high confidence", () => {
  const correction = {
    kind: "social" as const,
    occasion: "Gallery opening",
    dressCode: "creative cocktail",
    correctedAt: "2026-07-19T18:00:00Z",
  };
  const item = mapCalendarEventToDailyAgendaItem(calendarEvent({ title: "Opening" }), correction);
  assert.equal(item.occasionClassification.kind, "social");
  assert.equal(item.occasionClassification.source, "user");
  assert.equal(item.occasionClassification.correctedByUser, true);
  assert.equal(item.dressCodeInference.dressCode, "creative cocktail");
  assert.equal(item.dressCodeInference.confidence, "high");
  assert.deepEqual(item.userCorrection, correction);
});
