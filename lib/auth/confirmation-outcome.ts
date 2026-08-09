import type { ConfirmationCredentials } from "./confirmation-credentials";

const SESSION_EXCHANGE_ONLY_ERRORS = new Set([
  "flow_state_not_found",
  "flow_state_expired",
  "bad_code_verifier",
  "pkce_verifier_not_found",
]);

export function confirmationFallback(input: {
  credentials: ConfirmationCredentials;
  errorCode?: string | null;
  upstreamError?: string | null;
}) {
  if (!input.credentials) {
    return input.upstreamError ? "confirmation-error" as const : "confirmed-sign-in" as const;
  }
  if (
    input.credentials.kind === "code" &&
    input.errorCode &&
    SESSION_EXCHANGE_ONLY_ERRORS.has(input.errorCode)
  ) {
    return "confirmed-sign-in" as const;
  }
  return "confirmation-error" as const;
}
