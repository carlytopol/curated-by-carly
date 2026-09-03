import { randomUUID } from "node:crypto";
import type { GovernedRecommendationResult } from "@/lib/recommendations/engine/types";
import {
  RECOMMENDATION_DIAGNOSTIC_VERSION,
  type DiagnosticScoreComponent,
  type RecommendationDiagnostic,
} from "./types";

type InspectorInput = {
  userId: string;
  dailyEventId: string;
  recommendationSetId?: string | null;
  engineVersion: string;
  featureFlags: Record<string, boolean | string>;
  result: GovernedRecommendationResult;
  itemLabels?: Map<string, string> | Record<string, string>;
  createdAt?: string;
  traceId?: string;
};

const labelFor = (
  labels: InspectorInput["itemLabels"],
  itemId: string,
) => labels instanceof Map ? labels.get(itemId) ?? itemId : labels?.[itemId] ?? itemId;

function cohesionBreakdown(result: GovernedRecommendationResult, optionIndex: number): DiagnosticScoreComponent[] {
  const option = result.options[optionIndex];
  return [
    {
      name: "governed-cohesion",
      score: option.assessment.factorScores.cohesion,
      explanation: "Whole-outfit cohesion recorded by deterministic assessment.",
    },
    {
      name: "personal-style-cohesion",
      score: option.personalStyle.cohesionScore,
      explanation: "Cohesion against the request-specific Personal Styling Brief.",
    },
    {
      name: "color-harmony",
      score: option.assessment.factorScores.color,
      explanation: "Color relationship recorded by the governed engine.",
    },
  ];
}

function polishBreakdown(result: GovernedRecommendationResult, optionIndex: number): DiagnosticScoreComponent[] {
  const option = result.options[optionIndex];
  return [
    {
      name: "contextual-polish",
      score: option.assessment.factorScores.polish,
      explanation: "Event-appropriate polish recorded by deterministic assessment.",
    },
    {
      name: "personal-polish",
      score: option.personalStyle.personalPolishScore,
      explanation: "Polish relative to this user’s interpreted style.",
    },
    {
      name: "intent-alignment",
      score: option.assessment.factorScores.intent,
      explanation: "Alignment with the user’s stated intention.",
    },
  ];
}

function confidenceComponents(result: GovernedRecommendationResult, optionIndex?: number): DiagnosticScoreComponent[] {
  const option = typeof optionIndex === "number" ? result.options[optionIndex] : null;
  const knownContext = 7 - Math.min(result.context.unknowns.length, 7);
  const eligibleItems = result.eligibilityAudit.filter((item) => item.eligible).length;
  return [
    {
      name: "context-completeness",
      score: Math.round((knownContext / 7) * 100),
      explanation: `${result.context.unknowns.length} context field(s) remain unknown.`,
    },
    {
      name: "eligible-wardrobe-depth",
      score: result.eligibilityAudit.length
        ? Math.round((eligibleItems / result.eligibilityAudit.length) * 100)
        : null,
      explanation: `${eligibleItems} of ${result.eligibilityAudit.length} audited items passed eligibility.`,
    },
    {
      name: "outfit-assessment",
      score: option?.assessment.score ?? null,
      explanation: option
        ? "Approved outfit’s governed assessment."
        : "No approved outfit was available.",
    },
  ];
}

export function buildRecommendationDiagnostic(input: InspectorInput): RecommendationDiagnostic {
  const { result } = input;
  const labels = input.itemLabels;
  return {
    schemaVersion: RECOMMENDATION_DIAGNOSTIC_VERSION,
    traceId: input.traceId ?? randomUUID(),
    createdAt: input.createdAt ?? new Date().toISOString(),
    userId: input.userId,
    dailyEventId: input.dailyEventId,
    recommendationSetId: input.recommendationSetId ?? null,
    engineVersion: input.engineVersion,
    featureFlags: { ...input.featureFlags },
    eventPolicy: result.context.constraintMatrix,
    weatherInputs: result.context.weather,
    venueInputs: {
      venue: result.context.venue,
      setting: result.context.setting,
      venueRules: result.context.venueRules,
      unknowns: result.context.unknowns,
    },
    styleProfileInputs: result.styleProfile,
    wardrobeEvidenceInputs: result.stylingBrief.wardrobeEvidence,
    personalStyleInterpretationInputs: result.stylingBrief,
    candidateOutfits: result.diagnostics.map((candidate) => ({
      ...candidate,
      labels: candidate.candidateItemIds.map((itemId) => labelFor(labels, itemId)),
    })),
    candidateTraceTruncated: result.rejectedCandidateCount > result.diagnostics.length,
    rejectedCandidateCount: result.rejectedCandidateCount,
    itemEligibilityAudit: result.eligibilityAudit,
    finalRecommendations: result.options.map((option, optionIndex) => ({
      optionIndex,
      itemIds: option.itemIds,
      labels: option.itemIds.map((itemId) => labelFor(labels, itemId)),
      template: option.composition.foundation.kind,
      summary: option.summary,
      rationale: option.rationale,
      totalScore: option.assessment.score,
      cohesion: cohesionBreakdown(result, optionIndex),
      personalPolish: polishBreakdown(result, optionIndex),
      confidence: {
        level: option.assessment.confidence,
        components: confidenceComponents(result, optionIndex),
      },
    })),
    overallConfidence: {
      level: result.confidence,
      components: confidenceComponents(result),
    },
    noRecommendationReason: result.noRecommendationReason,
  };
}
