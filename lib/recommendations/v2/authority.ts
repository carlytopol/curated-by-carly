import type { EvidenceAuthority, EvidenceSourceType } from "./taxonomy";

export const RECOMMENDATION_AUTHORITY_VERSION = "recommendation-authority.v2.1.0" as const;

export type CustomerActor = {
  kind: "customer";
  actorUserId: string;
};

export type AuthorizedCustomerServiceActor = {
  kind: "authorized-customer-service";
  actorId: string;
  authorizationId: string;
  targetUserId: string;
  reason: string;
  confirmationChannel: "in-app" | "email" | "support-session";
};

export type NonMutatingActor = {
  kind:
    | "connected-external-service"
    | "product-evaluation"
    | "founder-evaluation"
    | "diagnostic"
    | "automated-test"
    | "inference";
  actorId: string;
};

export type RecommendationActor =
  | CustomerActor
  | AuthorizedCustomerServiceActor
  | NonMutatingActor;

export type CustomerStateMutationAuthorization = {
  authorityVersion: typeof RECOMMENDATION_AUTHORITY_VERSION;
  targetUserId: string;
  actor: RecommendationActor;
  idempotencyKey: string;
  requestedAt: string;
};

export type MutationAuthorizationResult =
  | {
      authorized: true;
      authority: "customer-current" | "authorized-customer-service";
      auditRequired: boolean;
    }
  | {
      authorized: false;
      reason:
        | "actor-not-authorized"
        | "customer-mismatch"
        | "customer-service-target-mismatch"
        | "customer-service-audit-incomplete"
        | "invalid-idempotency-key";
    };

export const AUTHORITY_SOURCE_MATRIX: ReadonlyArray<{
  authority: EvidenceAuthority;
  allowedSources: readonly EvidenceSourceType[];
  mayMutateCustomerState: boolean;
}> = [
  { authority: "customer-current", allowedSources: ["customer-statement", "correction", "suppression"], mayMutateCustomerState: true },
  { authority: "customer-durable", allowedSources: ["profile", "correction", "suppression"], mayMutateCustomerState: false },
  { authority: "authorized-customer-service", allowedSources: ["customer-service-action"], mayMutateCustomerState: true },
  { authority: "connected-external-service", allowedSources: ["calendar", "weather", "venue"], mayMutateCustomerState: false },
  { authority: "canonical-fact", allowedSources: ["wardrobe-item", "system"], mayMutateCustomerState: false },
  { authority: "verified-source", allowedSources: ["weather", "venue"], mayMutateCustomerState: false },
  { authority: "confirmed-behavior", allowedSources: ["worn-history", "style-archive", "outfit-memory"], mayMutateCustomerState: false },
  { authority: "inference", allowedSources: ["profile", "wardrobe-item", "worn-history", "style-archive", "outfit-memory"], mayMutateCustomerState: false },
  { authority: "product-evaluation", allowedSources: ["product-evaluation"], mayMutateCustomerState: false },
  { authority: "founder-evaluation", allowedSources: ["founder-evaluation"], mayMutateCustomerState: false },
  { authority: "automated-test", allowedSources: ["automated-test"], mayMutateCustomerState: false },
  { authority: "system-fact", allowedSources: ["system"], mayMutateCustomerState: false },
  { authority: "unknown", allowedSources: ["customer-statement", "system"], mayMutateCustomerState: false },
] as const;

export function authorizeCustomerStateMutation(
  input: CustomerStateMutationAuthorization,
): MutationAuthorizationResult {
  if (!input.idempotencyKey.trim()) {
    return { authorized: false, reason: "invalid-idempotency-key" };
  }
  if (input.actor.kind === "customer") {
    return input.actor.actorUserId === input.targetUserId
      ? { authorized: true, authority: "customer-current", auditRequired: false }
      : { authorized: false, reason: "customer-mismatch" };
  }
  if (input.actor.kind === "authorized-customer-service") {
    if (input.actor.targetUserId !== input.targetUserId) {
      return { authorized: false, reason: "customer-service-target-mismatch" };
    }
    if (
      !input.actor.actorId.trim()
      || !input.actor.authorizationId.trim()
      || !input.actor.reason.trim()
      || !input.actor.confirmationChannel
    ) {
      return { authorized: false, reason: "customer-service-audit-incomplete" };
    }
    return { authorized: true, authority: "authorized-customer-service", auditRequired: true };
  }
  return { authorized: false, reason: "actor-not-authorized" };
}

export function mayAuthorityMutateCustomerState(authority: EvidenceAuthority) {
  return AUTHORITY_SOURCE_MATRIX.some(
    (entry) => entry.authority === authority && entry.mayMutateCustomerState,
  );
}
