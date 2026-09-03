import type { CalendarConnectionStatus } from "./connections";

export type GoogleCalendarViewState = "loading" | "disconnected" | "connected" | "expired" | "empty" | "error";

export function deriveGoogleCalendarViewState(input: { loading: boolean; configured: boolean; status?: CalendarConnectionStatus; eventCount?: number; failed?: boolean }): GoogleCalendarViewState {
  if (input.loading) return "loading";
  if (!input.configured) return "error";
  if (!input.status) return "disconnected";
  if (input.status === "needs_reauth") return "expired";
  if (input.status === "error" || input.status === "disconnecting" || input.failed) return "error";
  return (input.eventCount ?? 0) === 0 ? "empty" : "connected";
}
