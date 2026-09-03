import "server-only";

import {
  resolveRecommendationEngineForAccount,
  type RecommendationAccountRoutingConfig,
} from "./account-routing";

function enabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

function userIds(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}

export function readRecommendationAccountRoutingConfig(): RecommendationAccountRoutingConfig {
  return {
    dormantCodeEnabled: enabled(process.env.RECOMMENDATION_V2_MAIN_APP_CODE_ENABLED),
    founderActivationAuthorized: enabled(
      process.env.RECOMMENDATION_V2_FOUNDER_ACTIVATION_AUTHORIZED,
    ),
    globalKillSwitch: !(
      process.env.RECOMMENDATION_V2_GLOBAL_KILL_SWITCH?.trim().toLowerCase() === "false"
    ),
    assignedUserIds: userIds(process.env.RECOMMENDATION_V2_ASSIGNED_USER_IDS),
    killedUserIds: userIds(process.env.RECOMMENDATION_V2_KILLED_USER_IDS),
    featureFlagRevision:
      process.env.RECOMMENDATION_V2_FEATURE_FLAG_REVISION?.trim() || "disabled",
  };
}

export function resolveServerRecommendationEngine(authenticatedUserId: string) {
  return resolveRecommendationEngineForAccount(
    authenticatedUserId,
    readRecommendationAccountRoutingConfig(),
  );
}
