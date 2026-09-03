import assert from "node:assert/strict";
import test from "node:test";
import { buildRecommendationDiagnostic } from "@/lib/recommendations/diagnostics/build-inspector";
import type { GovernedRecommendationResult } from "@/lib/recommendations/engine/types";

const evidence = <T,>(value: T) => ({
  value,
  provenance: "user" as const,
  confidence: "high" as const,
  source: "test",
});

function result(): GovernedRecommendationResult {
  const context: GovernedRecommendationResult["context"] = {
    agendaItem: {} as never,
    userNotes: evidence("Polished"),
    statedDressCode: evidence("Casual"),
    intention: evidence("Considered"),
    venue: evidence("Garden"),
    setting: evidence("outdoor" as const),
    walking: evidence("moderate" as const),
    evening: evidence(false),
    bagAllowed: evidence(true),
    pocketsRequired: evidence(false),
    weather: {
      temperature: evidence(78), feelsLike: evidence(80), high: evidence(82),
      low: evidence(68), precipitationChance: evidence(10),
      windSpeed: evidence(4), humidity: evidence(55),
    },
    constraintMatrix: {
      heatSeverity: "warm" as const,
      requestedPolish: "polished-casual" as const,
      hard: [], strongSoft: [], preferences: [],
    },
    venueRules: [],
    unknowns: ["wind"],
    dressingPosture: {
      version: "dressing-posture-v1-preview",
      archetype: "everyday-casual-social",
      formalityFloor: 1,
      formalityTarget: 2,
      formalityCeiling: 3,
      requestedPolish: "polished-casual",
      missingContextLowersConfidenceOnly: true,
    },
  };
  const stylingBrief = {
    schemaVersion: "personal-styling-brief.v1" as const,
    profileVersion: "profile-1", ownerUserId: "user-1", requestKey: "request",
    occasion: "social", desiredPolish: "polished-casual" as const,
    neutral: false, explicitCurrentInstructions: [], directives: [],
    wardrobeEvidence: {
      ownerUserId: "user-1", dominantSilhouettes: [], recurringColorFamilies: [],
      materialPatterns: [], formalityDistribution: [], occasionDistribution: [],
      frequentlyWornCombinations: [], highConfidenceBehavioralPatterns: [],
      underusedProfileAlignedItems: [], repeatedlyRejectedInContexts: [],
    },
    reconciliation: { conflicts: [], focusedQuestion: null },
  };
  return {
    options: [{
      itemIds: ["top", "bottom", "shoes"],
      composition: {
        foundation: {
          kind: "separates", onePiece: null,
          top: { id: "top", category: "Tops" },
          bottom: { id: "bottom", category: "Shorts" },
        },
        shoes: { id: "shoes", category: "Shoes" },
        bag: null, outerLayer: null, jewelry: [], fragrance: null,
      },
      assessment: {
        valid: true, score: 88, confidence: "high",
        factorScores: {
          occasion: 90, weather: 92, comfort: 85, cohesion: 86,
          completeness: 100, intent: 90, fit: null, color: 84,
          polish: 88, rotation: 75, utility: 90,
        },
        rejectionReasons: [], reasonCodes: [],
      },
      summary: "Garden polish", rationale: "Light and considered.",
      personalStyle: {
        briefVersion: "personal-styling-brief.v1",
        score: 89, personalPolishScore: 91, cohesionScore: 87,
        matchedDirectiveIds: [], conflictingDirectiveIds: [], rejectionReasons: [],
      },
      stylingBriefVersion: "personal-styling-brief.v1",
    }],
    confidence: "high", context, rejectedCandidateCount: 1,
    noRecommendationReason: null,
    diagnostics: [{
      candidateItemIds: ["dress", "shoes"],
      normalizedRoles: [
        { itemId: "dress", label: "Dress", role: "one-piece" },
        { itemId: "shoes", label: "Shoes", role: "shoes" },
      ],
      selectedTemplate: "dress-or-jumpsuit", hardRules: [],
      finalScore: null, approved: false, rejectionReasons: ["weather"],
    }],
    eligibilityAudit: [],
    styleProfile: {
      ownerUserId: "user-1", version: "profile-1", status: "active", preferences: [],
    },
    stylingBrief,
  };
}

test("Recommendation Inspector preserves policy, evidence, rejections, and score breakdowns", () => {
  const diagnostic = buildRecommendationDiagnostic({
    userId: "user-1",
    dailyEventId: "event-1",
    recommendationSetId: "set-1",
    engineVersion: "engine-1",
    featureFlags: { diagnostics: true },
    result: result(),
    itemLabels: { top: "Silk shell", bottom: "Tailored shorts", shoes: "Loafers" },
    traceId: "trace-1",
    createdAt: "2026-07-28T12:00:00.000Z",
  });
  assert.equal(diagnostic.eventPolicy.requestedPolish, "polished-casual");
  assert.equal(diagnostic.candidateOutfits[0].rejectionReasons[0], "weather");
  assert.deepEqual(diagnostic.finalRecommendations[0].labels, [
    "Silk shell", "Tailored shorts", "Loafers",
  ]);
  assert.equal(diagnostic.finalRecommendations[0].cohesion[0].score, 86);
  assert.equal(diagnostic.finalRecommendations[0].personalPolish[1].score, 91);
  assert.equal(diagnostic.overallConfidence.level, "high");
});
