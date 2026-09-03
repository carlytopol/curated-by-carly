export const TRAVEL_CONVERSATION_LIFETIME_MS = 4 * 60 * 60 * 1000;

const CLIENT_REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidTravelRequestId(value: string) {
  return CLIENT_REQUEST_ID.test(value);
}

export function isRetryableTravelFailure(code: string | undefined) {
  return code === "request_rate_limited"
    || code === "conversation_read_failed"
    || code === "conversation_persistence_failed"
    || code === "travel_context_unavailable"
    || code === "ai_rate_limited"
    || code === "ai_timed_out"
    || code === "ai_unavailable";
}

export function conversationInputForRequest<T extends {
  id: string;
  role: "user" | "assistant";
  content: string;
}>(
  savedMessages: T[],
  current: { id: string; content: string },
) {
  return [
    ...savedMessages
      .filter((message) => message.id !== current.id)
      .map(({ role, content }) => ({ role, content })),
    { role: "user" as const, content: current.content },
  ].slice(-12);
}
