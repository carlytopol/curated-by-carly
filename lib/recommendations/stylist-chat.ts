export type StylistChatState = "empty" | "loading" | "ready" | "error";

export function stylistChatEndpoint(recommendationId: string) {
  return `/api/recommendations/${encodeURIComponent(recommendationId)}/follow-up`;
}
