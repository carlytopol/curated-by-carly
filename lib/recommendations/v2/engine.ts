import type { CustomerDressingBrief } from "./contracts";
import {
  resolveDressingPosture,
  type GovernedWeatherEvidence,
  type NarrowEventPolicyResult,
} from "./dressing-posture";
import type { PersonalOutfitMemorySnapshot } from "./personal-outfit-memory";
import {
  adjudicateValidatedLooks,
  assertPipelineOrder,
  buildPersonalOutfitDirections,
  composeRestrainedLooks,
  hardValidateLook,
  rebuildViableDirectionPortfolio,
  retrieveGarmentsForDirections,
  type AdjudicationOutcome,
  type ComparativeJudgment,
  type HardValidationResult,
  type StyleProfileProjection,
  type WardrobeGarment,
} from "./recommendation-pipeline";
import type { ArtifactRef } from "./taxonomy";

export const RECOMMENDATION_ENGINE_V2_VERSION = "recommendation-engine.v2.1.1" as const;
export const RECOMMENDATION_V2_CACHE_NAMESPACE = "recommendation-v2.1.1" as const;

export type RecommendationV2Trace = {
  engineVersion: typeof RECOMMENDATION_ENGINE_V2_VERSION;
  cacheNamespace: typeof RECOMMENDATION_V2_CACHE_NAMESPACE;
  requestId: string;
  ownerUserId: string;
  stages: string[];
  posture: {
    artifactId: string;
    schemaVersion: string;
    confidence: string;
    evidenceIds: string[];
    criticalUnknownCount: number;
  };
  directionIds: string[];
  retrievals: Array<{
    directionId: string;
    foundationConcept: string;
    requiredRoles: string[];
    foundationCandidateCount: number;
    supportCandidateCounts: Record<string, number>;
    rejectedItems: Array<{ itemId: string; reasonCodes: string[] }>;
  }>;
  candidateIds: string[];
  rejectedCandidates: Array<{
    candidateId: string;
    failedChecks: Array<{ check: string; reasonCodes: string[] }>;
  }>;
  judgments: Array<{
    lookId: string;
    comparativeRank: number;
    passed: boolean;
    decisiveReasonCodes: string[];
  }>;
  adjudicationOutcome: AdjudicationOutcome["outcome"];
};

export type StylistJudgmentProvider = (input: {
  brief: CustomerDressingBrief;
  posture: ReturnType<typeof resolveDressingPosture>;
  validated: HardValidationResult[];
}) => ComparativeJudgment[];

type RecommendationV2BaseInput = {
  generatedAt: string;
  brief: CustomerDressingBrief;
  eventPolicy: NarrowEventPolicyResult;
  weather: GovernedWeatherEvidence;
  memory: PersonalOutfitMemorySnapshot;
  style: StyleProfileProjection;
  correctionStateRef: ArtifactRef<"correction-state.v2.3.0">;
  suppressionStateRef: ArtifactRef<"suppression-state.v2.3.0">;
  adjudicate: StylistJudgmentProvider;
};

export type RecommendationV2PreRetrievalContext = {
  posture: ReturnType<typeof resolveDressingPosture>;
  directions: ReturnType<typeof buildPersonalOutfitDirections>;
};

function resolvePreRetrievalContext(
  input: RecommendationV2BaseInput,
): RecommendationV2PreRetrievalContext & { stages: string[] } {
  const stages: string[] = ["customer-dressing-brief", "event-policy"];
  const posture = resolveDressingPosture({
    artifactId: `${input.brief.artifactId}:posture`,
    artifactRevision: "1",
    generatedAt: input.generatedAt,
    brief: input.brief,
    eventPolicy: input.eventPolicy,
    weather: input.weather,
  });
  stages.push("dressing-posture", "personal-outfit-memory");
  const directions = buildPersonalOutfitDirections({
    posture,
    brief: input.brief,
    eventPolicy: input.eventPolicy,
    memory: input.memory,
    style: input.style,
    correctionStateRef: input.correctionStateRef,
    suppressionStateRef: input.suppressionStateRef,
  });
  stages.push("personal-outfit-directions");
  return { posture, directions, stages };
}

function completeRecommendationV2(
  input: RecommendationV2BaseInput,
  context: RecommendationV2PreRetrievalContext & { stages: string[] },
  wardrobe: WardrobeGarment[],
): { outcome: AdjudicationOutcome; trace: RecommendationV2Trace } {
  const { posture, directions, stages } = context;
  const retrievals = retrieveGarmentsForDirections({
    directions,
    posture,
    brief: input.brief,
    style: input.style,
    memory: input.memory,
    wardrobe,
  });
  stages.push("direction-led-retrieval");
  const viableRetrievals = rebuildViableDirectionPortfolio(retrievals);
  const candidates = composeRestrainedLooks({ retrievals: viableRetrievals, generatedAt: input.generatedAt });
  stages.push("restrained-composition");
  const validated = candidates.map((look) => {
    const direction = directions.find((item) => item.artifactId === look.directionRef.artifactId);
    if (!direction) throw new Error("Candidate direction is missing");
    return hardValidateLook({
      look,
      direction,
      posture,
      eventPolicy: input.eventPolicy,
      brief: input.brief,
      style: input.style,
    });
  });
  stages.push("hard-validation");
  const judgments = input.adjudicate({ brief: input.brief, posture, validated });
  const candidateIds = new Set(validated.map((item) => item.look.artifactId));
  if (judgments.some((judgment) => !candidateIds.has(judgment.lookId))) {
    throw new Error("Stylist adjudication referenced a look outside this request");
  }
  if (new Set(judgments.map((judgment) => judgment.lookId)).size !== judgments.length) {
    throw new Error("Stylist adjudication returned duplicate look judgments");
  }
  const validCandidateIds = validated.filter((item) => item.passed).map((item) => item.look.artifactId);
  if (validCandidateIds.some((lookId) => !judgments.some((judgment) => judgment.lookId === lookId))) {
    throw new Error("Stylist adjudication must judge every deterministically valid look");
  }
  const ranks = judgments.map((judgment) => judgment.comparativeRank);
  if (ranks.some((rank) => !Number.isInteger(rank) || rank < 1) || new Set(ranks).size !== ranks.length) {
    throw new Error("Stylist adjudication ranks must be unique positive integers");
  }
  const outcome = adjudicateValidatedLooks({
    validated,
    judgments,
    consequentialQuestion: posture.criticalUnknowns.find((item) =>
      item.consequence === "changes-viability")?.focusedQuestion,
  });
  stages.push("stylist-adjudication");
  assertPipelineOrder(stages);
  return {
    outcome,
    trace: {
      engineVersion: RECOMMENDATION_ENGINE_V2_VERSION,
      cacheNamespace: RECOMMENDATION_V2_CACHE_NAMESPACE,
      requestId: input.brief.requestId,
      ownerUserId: input.brief.ownerUserId,
      stages,
      posture: {
        artifactId: posture.artifactId,
        schemaVersion: posture.schemaVersion,
        confidence: posture.confidence,
        evidenceIds: posture.evidenceRefs.map((item) => item.evidenceId),
        criticalUnknownCount: posture.criticalUnknowns.length,
      },
      directionIds: directions.map((item) => item.artifactId),
      retrievals: retrievals.map((item) => ({
        directionId: item.direction.artifactId,
        foundationConcept: item.direction.foundationConcept,
        requiredRoles: item.direction.requiredRoles,
        foundationCandidateCount: item.foundationCandidates.length,
        supportCandidateCounts: Object.fromEntries(
          Object.entries(item.supportCandidates).map(([role, garments]) => [role, garments?.length ?? 0]),
        ),
        rejectedItems: item.rejectionReasons.map((rejection) => ({
          itemId: rejection.itemId,
          reasonCodes: rejection.reasonCodes,
        })),
      })),
      candidateIds: candidates.map((item) => item.artifactId),
      rejectedCandidates: validated.filter((item) => !item.passed).map((item) => ({
        candidateId: item.look.artifactId,
        failedChecks: item.checks.filter((check) => !check.passed).map((check) => ({
          check: check.check,
          reasonCodes: check.reasonCodes,
        })),
      })),
      judgments: judgments.map((judgment) => ({
        lookId: judgment.lookId,
        comparativeRank: judgment.comparativeRank,
        passed: ["reality", "personalPlausibility", "effort", "coherence", "restraint", "editorial"]
          .every((key) => judgment[key as keyof ComparativeJudgment] === "pass"),
        decisiveReasonCodes: judgment.decisiveReasonCodes,
      })),
      adjudicationOutcome: outcome.outcome,
    },
  };
}

/**
 * Main-application orchestration boundary. Canonical wardrobe data is loaded
 * only after the day has been resolved into Dressing Posture and personal
 * outfit directions. The callback is server-only and must remain owner scoped.
 */
export async function runRecommendationV2WithLazyWardrobe(
  input: RecommendationV2BaseInput & {
    loadWardrobe: (context: RecommendationV2PreRetrievalContext) => Promise<WardrobeGarment[]>;
  },
): Promise<{ outcome: AdjudicationOutcome; trace: RecommendationV2Trace }> {
  const context = resolvePreRetrievalContext(input);
  const wardrobe = await input.loadWardrobe({ posture: context.posture, directions: context.directions });
  return completeRecommendationV2(input, context, wardrobe);
}

/**
 * This orchestration boundary is intentionally unreachable from current
 * application routes. It makes the V2 authority order executable and testable
 * without changing Current Preview or Production behavior.
 */
export function runIsolatedRecommendationV2(input: RecommendationV2BaseInput & {
  wardrobe: WardrobeGarment[];
}): { outcome: AdjudicationOutcome; trace: RecommendationV2Trace } {
  return completeRecommendationV2(input, resolvePreRetrievalContext(input), input.wardrobe);
}

export const V2_EVALUATION_RELEASE_STATE = {
  enabledByDefault: false,
  currentPreviewUnaffected: true,
  productionUnaffected: true,
  safelyDisableable: true,
  activationAuthorized: false,
} as const;
