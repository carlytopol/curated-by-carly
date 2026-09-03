export type CalendarProvider = "google" | "microsoft" | "ics";

/**
 * Provider-neutral ingestion record. Provider adapters are responsible for
 * projecting their payloads into this minimal shape before agenda logic runs.
 */
export type CalendarEvent = {
  /** Curated-generated opaque reference, never a raw provider event ID. */
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string | null;
  provider: CalendarProvider;
  calendarName: string;
  isAllDay: boolean;
};
