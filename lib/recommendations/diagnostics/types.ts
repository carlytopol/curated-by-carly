import type { ConfidenceLevel } from "@/types/daily-agenda";
import type {
  CandidateDecisionTrace,
  ContextEvidence,
  GovernedOutfit,
  ItemEligibilityAudit,
} from "@/lib/recommendations/engine/types";
import type {
  PersonalStylingBrief,
  ResolvedStyleProfile,
  WardrobeEvidenceSummary,
} from "@/lib/recommendations/engine/style-profile";

export const RECOMMENDATION_DIAGNOSTIC_VERSION = "recommendation-diagnostic.v1" as const;

export type DiagnosticScoreComponent = {
  name: string;
  score: number | null;
  explanation: string;
};

export type DiagnosticCandidate = CandidateDecisionTrace & {
  labels: string[];
};

export type DiagnosticFinalRecommendation = {
  optionIndex: number;
  itemIds: string[];
  labels: string[];
  template: GovernedOutfit["composition"]["foundation"]["kind"];
  summary: string;
  rationale: string;
  totalScore: number;
  cohesion: DiagnosticScoreComponent[];
  personalPolish: DiagnosticScoreComponent[];
  confidence: {
    level: ConfidenceLevel;
    components: DiagnosticScoreComponent[];
  };
};

export type RecommendationDiagnostic = {
  schemaVersion: typeof RECOMMENDATION_DIAGNOSTIC_VERSION;
  traceId: string;
  createdAt: string;
  userId: string;
  dailyEventId: string;
  recommendationSetId: string | null;
  engineVersion: string;
  featureFlags: Record<string, boolean | string>;
  eventPolicy: ContextEvidence["constraintMatrix"];
  weatherInputs: ContextEvidence["weather"];
  venueInputs: Pick<ContextEvidence, "venue" | "setting" | "venueRules" | "unknowns">;
  styleProfileInputs: ResolvedStyleProfile;
  wardrobeEvidenceInputs: WardrobeEvidenceSummary;
  personalStyleInterpretationInputs: PersonalStylingBrief;
  candidateOutfits: DiagnosticCandidate[];
  candidateTraceTruncated: boolean;
  rejectedCandidateCount: number;
  itemEligibilityAudit: ItemEligibilityAudit[];
  finalRecommendations: DiagnosticFinalRecommendation[];
  overallConfidence: {
    level: ConfidenceLevel;
    components: DiagnosticScoreComponent[];
  };
  noRecommendationReason: string | null;
};
