import type { CalendarEvent } from "@/types/calendar";
import type {
  DailyAgenda,
  DailyAgendaItem,
  DailyAgendaUserCorrection,
  DressCodeInference,
  OccasionClassification,
} from "@/types/daily-agenda";
import { classifyOccasion, inferDressCode } from "./classify";

const TITLE_LIMIT = 300;
const LOCATION_LIMIT = 500;
const CALENDAR_NAME_LIMIT = 150;

function cleanText(value: string | null, limit: number) {
  if (value === null) return null;
  const clean = value.replace(/\s+/g, " ").trim();
  return clean ? clean.slice(0, limit) : null;
}

function hasOwn(value: object, key: PropertyKey) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function applyOccasionCorrection(
  inferred: OccasionClassification,
  correction: DailyAgendaUserCorrection | null,
): OccasionClassification {
  if (!correction || (!hasOwn(correction, "kind") && !hasOwn(correction, "occasion"))) return inferred;
  return {
    kind: correction.kind ?? inferred.kind,
    occasion: hasOwn(correction, "occasion") ? correction.occasion ?? null : inferred.occasion,
    confidence: "high",
    source: "user",
    reasonCode: "user_correction",
    correctedByUser: true,
  };
}

function applyDressCodeCorrection(
  inferred: DressCodeInference,
  correction: DailyAgendaUserCorrection | null,
): DressCodeInference {
  if (!correction || !hasOwn(correction, "dressCode")) return inferred;
  return {
    dressCode: correction.dressCode ?? null,
    confidence: "high",
    source: "user",
    reasonCode: "user_correction",
    correctedByUser: true,
  };
}

export function mapCalendarEventToDailyAgendaItem(
  event: CalendarEvent,
  correction: DailyAgendaUserCorrection | null = null,
): DailyAgendaItem {
  const title = cleanText(event.title, TITLE_LIMIT) ?? "Busy";
  const location = cleanText(event.location, LOCATION_LIMIT);
  const calendarName = cleanText(event.calendarName, CALENDAR_NAME_LIMIT) ?? "Calendar";
  const evidence = { title, location, isAllDay: event.isAllDay };
  const occasionClassification = applyOccasionCorrection(classifyOccasion(evidence), correction);
  const dressCodeInference = applyDressCodeCorrection(
    inferDressCode(evidence, occasionClassification),
    correction,
  );

  return {
    id: event.id,
    source: "calendar",
    title,
    startTime: event.startTime,
    endTime: event.endTime,
    isAllDay: event.isAllDay,
    location,
    occasionClassification,
    dressCodeInference,
    provider: event.provider,
    calendarName,
    isReadOnly: true,
    userCorrection: correction,
    hasTimeConflict: false,
    overlapsWithItemIds: [],
  };
}

function timedRange(item: DailyAgendaItem) {
  if (item.isAllDay || !item.startTime || !item.endTime) return null;
  const start = Date.parse(item.startTime);
  const end = Date.parse(item.endTime);
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? { start, end } : null;
}

export function annotateAgendaOverlaps(items: DailyAgendaItem[]): DailyAgendaItem[] {
  const overlaps = new Map(items.map((item) => [item.id, new Set<string>()]));
  for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
    const left = timedRange(items[leftIndex]);
    if (!left) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
      const right = timedRange(items[rightIndex]);
      if (!right) continue;
      if (left.start < right.end && right.start < left.end) {
        overlaps.get(items[leftIndex].id)?.add(items[rightIndex].id);
        overlaps.get(items[rightIndex].id)?.add(items[leftIndex].id);
      }
    }
  }
  return items.map((item) => {
    const itemOverlaps = [...(overlaps.get(item.id) ?? [])].sort();
    return { ...item, hasTimeConflict: itemOverlaps.length > 0, overlapsWithItemIds: itemOverlaps };
  });
}

function agendaSort(left: DailyAgendaItem, right: DailyAgendaItem) {
  if (left.isAllDay !== right.isAllDay) return left.isAllDay ? -1 : 1;
  const leftStart = left.startTime ? Date.parse(left.startTime) : Number.POSITIVE_INFINITY;
  const rightStart = right.startTime ? Date.parse(right.startTime) : Number.POSITIVE_INFINITY;
  if (leftStart !== rightStart) return leftStart - rightStart;
  return left.title.localeCompare(right.title);
}

export type BuildDailyAgendaInput = {
  id: string;
  date: string;
  timezone: string;
  events: CalendarEvent[];
  corrections?: Readonly<Record<string, DailyAgendaUserCorrection>>;
  generatedAt: string;
};

export function buildDailyAgendaFromCalendarEvents(input: BuildDailyAgendaInput): DailyAgenda {
  const mapped = input.events.map((event) =>
    mapCalendarEventToDailyAgendaItem(event, input.corrections?.[event.id] ?? null),
  );
  return {
    id: input.id,
    date: input.date,
    timezone: input.timezone,
    items: annotateAgendaOverlaps(mapped).sort(agendaSort),
    weatherContext: null,
    generatedAt: input.generatedAt,
  };
}
