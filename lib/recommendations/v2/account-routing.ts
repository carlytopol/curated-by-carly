import { RECOMMENDATION_ENGINE_V2_VERSION } from "./engine";
import { RECOMMENDATION_ARCHITECTURE_V2 } from "./registry";

export const RECOMMENDATION_ACCOUNT_ROUTING_VERSION =
  "recommendation-account-routing.v1.0.0" as const;

export type RecommendationAccountRoutingConfig = {
  dormantCodeEnabled: boolean;
  founderActivationAuthorized: boolean;
  globalKillSwitch: boolean;
  assignedUserIds: ReadonlySet<string>;
  killedUserIds: ReadonlySet<string>;
  featureFlagRevision: string;
};

export type RecommendationAccountRoutingDecision =
  | {
      routingVersion: typeof RECOMMENDATION_ACCOUNT_ROUTING_VERSION;
      engine: "legacy";
      reason:
        | "v2-code-disabled"
        | "activation-not-authorized"
        | "global-kill-switch"
        | "account-not-assigned"
        | "account-kill-switch";
    }
  | {
      routingVersion: typeof RECOMMENDATION_ACCOUNT_ROUTING_VERSION;
      engine: "v2";
      engineVersion: typeof RECOMMENDATION_ENGINE_V2_VERSION;
      architectureVersion: typeof RECOMMENDATION_ARCHITECTURE_V2;
      featureFlagRevision: string;
      cachePartition: string;
    };

function validUserId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/**
 * Resolves recommendation authority from a server-verified Supabase subject.
 * The browser never supplies an engine, mode, email, or allowlist decision.
 */
export function resolveRecommendationEngineForAccount(
  authenticatedUserId: string,
  config: RecommendationAccountRoutingConfig,
): RecommendationAccountRoutingDecision {
  const base = { routingVersion: RECOMMENDATION_ACCOUNT_ROUTING_VERSION } as const;

  if (!config.dormantCodeEnabled) {
    return { ...base, engine: "legacy", reason: "v2-code-disabled" };
  }
  if (!config.founderActivationAuthorized) {
    return { ...base, engine: "legacy", reason: "activation-not-authorized" };
  }
  if (config.globalKillSwitch) {
    return { ...base, engine: "legacy", reason: "global-kill-switch" };
  }
  if (!validUserId(authenticatedUserId) || !config.assignedUserIds.has(authenticatedUserId)) {
    return { ...base, engine: "legacy", reason: "account-not-assigned" };
  }
  if (config.killedUserIds.has(authenticatedUserId)) {
    return { ...base, engine: "legacy", reason: "account-kill-switch" };
  }

  return {
    ...base,
    engine: "v2",
    engineVersion: RECOMMENDATION_ENGINE_V2_VERSION,
    architectureVersion: RECOMMENDATION_ARCHITECTURE_V2,
    featureFlagRevision: config.featureFlagRevision,
    cachePartition: [
      "curated",
      RECOMMENDATION_ARCHITECTURE_V2,
      RECOMMENDATION_ENGINE_V2_VERSION,
      config.featureFlagRevision,
      authenticatedUserId,
    ].map(encodeURIComponent).join(":"),
  };
}
