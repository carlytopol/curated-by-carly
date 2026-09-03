import type {
  CustomerCorrection,
  RecommendationSuppression,
} from "./customer-memory";

export const CURRENT_PREVIEW_V2_COMPATIBILITY_VERSION = "current-preview-v2-compatibility.v1.0.0" as const;

export type CurrentPreviewCompatibilityProjection = {
  compatibilityVersion: typeof CURRENT_PREVIEW_V2_COMPATIBILITY_VERSION;
  recordId: string;
  ownerUserId: string;
  visibility: "defined-not-connected" | "v2-only";
  writableFromCurrentPreview: false;
  reason: string;
};

export function projectCustomerMemoryForCurrentPreview(
  record: CustomerCorrection | RecommendationSuppression,
): CurrentPreviewCompatibilityProjection {
  const todayOnly = record.scope.kind === "today-only";
  return {
    compatibilityVersion: CURRENT_PREVIEW_V2_COMPATIBILITY_VERSION,
    recordId: record.id,
    ownerUserId: record.ownerUserId,
    visibility: todayOnly ? "defined-not-connected" : "v2-only",
    writableFromCurrentPreview: false,
    reason: todayOnly
      ? "A read-only exact-day projection is defined, but Current Preview does not consume or display it."
      : "Durable V2 scope has no safe legacy equivalent and remains V2-only.",
  };
}
