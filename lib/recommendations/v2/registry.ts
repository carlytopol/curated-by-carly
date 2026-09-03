import {
  CANDIDATE_LOOK_VERSION,
  CORRECTION_STATE_VERSION,
  CUSTOMER_DRESSING_BRIEF_VERSION,
  DRESSING_POSTURE_VERSION,
  EVENT_POLICY_RESULT_VERSION,
  MEMORY_SNAPSHOT_VERSION,
  PERSONAL_OUTFIT_DIRECTION_VERSION,
  STYLIST_ADJUDICATION_VERSION,
  SUPPRESSION_STATE_VERSION,
} from "./contracts";
import { RECOMMENDATION_V2_TAXONOMY_VERSION } from "./taxonomy";

export const RECOMMENDATION_ARCHITECTURE_V2 = "recommendation-architecture.v2" as const;

export const RECOMMENDATION_V2_SCHEMA_REGISTRY = {
  architectureVersion: RECOMMENDATION_ARCHITECTURE_V2,
  taxonomyVersion: RECOMMENDATION_V2_TAXONOMY_VERSION,
  contracts: {
    customerDressingBrief: CUSTOMER_DRESSING_BRIEF_VERSION,
    eventPolicyResult: EVENT_POLICY_RESULT_VERSION,
    dressingPosture: DRESSING_POSTURE_VERSION,
    personalOutfitDirection: PERSONAL_OUTFIT_DIRECTION_VERSION,
    candidateLook: CANDIDATE_LOOK_VERSION,
    correctionState: CORRECTION_STATE_VERSION,
    suppressionState: SUPPRESSION_STATE_VERSION,
    memorySnapshot: MEMORY_SNAPSHOT_VERSION,
    stylistAdjudicationDecision: STYLIST_ADJUDICATION_VERSION,
  },
  governingAuthorities: [
    "RECOMMENDATION_QUALITY_ROADMAP.md",
    "RECOMMENDATION_ARCHITECTURE_V2.md",
  ],
} as const;

export type V2ArtifactIdentity = {
  ownerUserId: string;
  requestId: string;
  architectureVersion: typeof RECOMMENDATION_ARCHITECTURE_V2;
  taxonomyVersion: typeof RECOMMENDATION_V2_TAXONOMY_VERSION;
  contractVersion: string;
  revisions: CacheRevisionIdentity;
};

export type CacheRevisionIdentity = {
  agendaContextRevision: string;
  weatherRevision: string;
  styleProfileRevision: string;
  wardrobeEvidenceRevision: string;
  correctionRevision: string;
  suppressionRevision: string;
  personalOutfitMemoryRevision: string;
  engineRevision: string;
  featureFlagRevision: string;
};

export function assertV2ArtifactIdentity(
  identity: V2ArtifactIdentity,
  expectedOwnerUserId: string,
) {
  if (!identity.ownerUserId || identity.ownerUserId !== expectedOwnerUserId) {
    throw new Error("V2 artifact ownership mismatch");
  }
  if (identity.architectureVersion !== RECOMMENDATION_ARCHITECTURE_V2) {
    throw new Error("V2 artifact architecture mismatch");
  }
  if (identity.taxonomyVersion !== RECOMMENDATION_V2_TAXONOMY_VERSION) {
    throw new Error("V2 artifact taxonomy mismatch");
  }
}

export function buildV2CacheNamespace(input: V2ArtifactIdentity) {
  assertV2ArtifactIdentity(input, input.ownerUserId);
  return [
    "curated",
    input.architectureVersion,
    input.taxonomyVersion,
    input.contractVersion,
    ...Object.entries(input.revisions)
      .sort(([left], [right]) => left.localeCompare(right))
      .flatMap(([key, value]) => [key, value]),
    input.ownerUserId,
    input.requestId,
  ].map(encodeURIComponent).join(":");
}
