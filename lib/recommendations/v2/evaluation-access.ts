export const V2_EVALUATION_ACCESS_VERSION = "v2-evaluation-access.v1.0.0" as const;

export type V2EvaluationAccessInput = {
  activationAuthorized: boolean;
  enabled: boolean;
  deploymentEnvironment: "development" | "preview" | "production" | "unknown";
  requestHost: string;
  isolatedHostAllowlist: string[];
  authenticatedEmail: string | null;
  founderEmailAllowlist: string[];
};

export type V2EvaluationAccessDecision =
  | {
      accessVersion: typeof V2_EVALUATION_ACCESS_VERSION;
      allowed: true;
      mode: "founder-v2-evaluation";
      cachePartition: "recommendation-v2-evaluation";
    }
  | {
      accessVersion: typeof V2_EVALUATION_ACCESS_VERSION;
      allowed: false;
      reason:
        | "activation-not-authorized"
        | "disabled"
        | "production-prohibited"
        | "non-isolated-host"
        | "unauthenticated"
        | "founder-not-allowlisted";
    };

const normalizeHost = (value: string) => value.trim().toLowerCase().replace(/\.$/, "");
const normalizeEmail = (value: string) => value.trim().toLowerCase();

/**
 * Pure release-gate policy. It does not grant recommendation authority and it
 * cannot change output. Founder access only exposes the same universal V2
 * engine to an isolated evaluation surface after Product authorizes activation.
 */
export function resolveV2EvaluationAccess(
  input: V2EvaluationAccessInput,
): V2EvaluationAccessDecision {
  const base = { accessVersion: V2_EVALUATION_ACCESS_VERSION } as const;
  if (!input.activationAuthorized) {
    return { ...base, allowed: false, reason: "activation-not-authorized" };
  }
  if (!input.enabled) return { ...base, allowed: false, reason: "disabled" };
  if (input.deploymentEnvironment === "production") {
    return { ...base, allowed: false, reason: "production-prohibited" };
  }
  const requestHost = normalizeHost(input.requestHost);
  const allowedHosts = new Set(input.isolatedHostAllowlist.map(normalizeHost).filter(Boolean));
  if (!requestHost || !allowedHosts.has(requestHost)) {
    return { ...base, allowed: false, reason: "non-isolated-host" };
  }
  if (!input.authenticatedEmail) {
    return { ...base, allowed: false, reason: "unauthenticated" };
  }
  const email = normalizeEmail(input.authenticatedEmail);
  const founderEmails = new Set(input.founderEmailAllowlist.map(normalizeEmail).filter(Boolean));
  if (!founderEmails.has(email)) {
    return { ...base, allowed: false, reason: "founder-not-allowlisted" };
  }
  return {
    ...base,
    allowed: true,
    mode: "founder-v2-evaluation",
    cachePartition: "recommendation-v2-evaluation",
  };
}
