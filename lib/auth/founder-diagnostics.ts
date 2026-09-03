import "server-only";
import { getCurrentIdentity } from "@/lib/auth/current-user";

function allowedEmails() {
  return new Set(
    (process.env.FOUNDER_DIAGNOSTICS_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function founderDiagnosticsConfigured() {
  return process.env.FOUNDER_DIAGNOSTICS_ENABLED === "true"
    && allowedEmails().size > 0;
}

export async function getFounderDiagnosticsIdentity() {
  if (!founderDiagnosticsConfigured()) return null;
  const identity = await getCurrentIdentity();
  if (!identity.isAuthenticated || !identity.id || !identity.email) return null;
  return allowedEmails().has(identity.email.toLowerCase()) ? identity : null;
}
