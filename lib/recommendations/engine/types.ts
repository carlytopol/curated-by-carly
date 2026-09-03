import type { ConfidenceLevel, DailyAgendaItem } from "@/types/daily-agenda";
import type {
  PersonalStyleAssessment,
  PersonalStylingBrief,
  ResolvedStyleProfile,
} from "./style-profile";
import type { GarmentEvidence } from "@/lib/recommendations/evidence/contracts";
import type { DressingPosture } from "./dressing-posture";

export type EvidenceProvenance = "verified" | "user" | "inferred" | "unknown";

export type EvidenceValue<T> = {
  value: T | null;
  provenance: EvidenceProvenance;
  confidence: ConfidenceLevel;
  source: string;
  retrievedAt?: string;
};

export type WeatherEvidence = {
  temperature: EvidenceValue<number>;
  feelsLike: EvidenceValue<number>;
  high: EvidenceValue<number>;
  low: EvidenceValue<number>;
  precipitationChance: EvidenceValue<number>;
  windSpeed: EvidenceValue<number>;
  humidity: EvidenceValue<number>;
};

export type VenueRule = {
  kind: "bag-policy" | "footwear" | "dress-code" | "setting" | "security";
  statement: string;
  effect: "no-bag" | "small-bag-only" | "clear-bag-only" | "outdoor" | "indoor" | "unknown";
  sourceUrl: string;
  retrievedAt: string;
  confidence: ConfidenceLevel;
};

export type ContextConstraint = {
  code: string;
  statement: string;
  provenance: EvidenceProvenance;
  source: string;
};

export type ContextConstraintMatrix = {
  heatSeverity: "none" | "warm" | "hot" | "extreme";
  requestedPolish: "relaxed" | "polished-casual" | "polished" | "formal" | null;
  hard: ContextConstraint[];
  strongSoft: ContextConstraint[];
  preferences: ContextConstraint[];
};

export type ContextEvidence = {
  agendaItem: DailyAgendaItem;
  userNotes: EvidenceValue<string>;
  statedDressCode: EvidenceValue<string>;
  intention: EvidenceValue<string>;
  venue: EvidenceValue<string>;
  setting: EvidenceValue<"indoor" | "outdoor" | "mixed">;
  walking: EvidenceValue<"low" | "moderate" | "high">;
  evening: EvidenceValue<boolean>;
  bagAllowed: EvidenceValue<boolean>;
  pocketsRequired: EvidenceValue<boolean>;
  weather: WeatherEvidence;
  constraintMatrix: ContextConstraintMatrix;
  venueRules: VenueRule[];
  unknowns: string[];
  dressingPosture: DressingPosture;
};

export type EngineWardrobeItem = {
  id: string;
  designer?: string | null;
  item_name?: string | null;
  department?: string | null;
  category: string | null;
  subcategory?: string | null;
  subcategory_2?: string | null;
  color?: string | null;
  season?: string | null;
  season_2?: string | null;
  season_3?: string | null;
  styling_suggestion?: string | null;
  favorite?: boolean;
  rotationScore?: number;
  last_worn_at?: string | null;
  last_recommended_at?: string | null;
  lastRecommendedAt?: string | null;
  availability_status?: string | null;
  unavailable_until?: string | null;
  analysis_metadata?: unknown;
  /** Canonical, provenance-bearing garment facts shared by every feature. */
  garmentEvidence?: GarmentEvidence;
};

export type OutfitFoundation =
  | {
      kind: "dress-or-jumpsuit";
      onePiece: EngineWardrobeItem;
      top: null;
      bottom: null;
    }
  | {
      kind: "separates";
      onePiece: null;
      top: EngineWardrobeItem;
      bottom: EngineWardrobeItem;
    }
  | {
      kind: "coordinated-set";
      onePiece: null;
      top: EngineWardrobeItem;
      bottom: EngineWardrobeItem;
    };

export type HardRuleResult = {
  rule: string;
  passed: boolean;
  detail: string;
};

export type CandidateDecisionTrace = {
  candidateItemIds: string[];
  normalizedRoles: Array<{ itemId: string; label: string; role: string }>;
  selectedTemplate: OutfitFoundation["kind"] | "invalid";
  hardRules: HardRuleResult[];
  finalScore: number | null;
  approved: boolean;
  rejectionReasons: string[];
};

export type ItemEligibilityAudit = {
  itemId: string;
  label: string;
  authoritativeCategory: string | null;
  authoritativeSubcategory: string | null;
  normalizedRole: string;
  materials: string[];
  formality: number | null;
  weatherSuitability: "eligible" | "ineligible" | "unknown";
  venueSuitability: "eligible" | "ineligible" | "unknown";
  walkingStandingSuitability: "eligible" | "ineligible" | "unknown";
  polishScore: number | null;
  hardRules: HardRuleResult[];
  eligible: boolean;
  rejectionReasons: string[];
};

/**
 * The only object the recommendation engine is allowed to evaluate or return.
 * A loose collection of garments is deliberately not representable here.
 */
export type CompleteOutfit = {
  foundation: OutfitFoundation;
  shoes: EngineWardrobeItem;
  bag: EngineWardrobeItem | null;
  outerLayer: EngineWardrobeItem | null;
  jewelry: EngineWardrobeItem[];
  fragrance: EngineWardrobeItem | null;
};

export type OutfitFactor =
  | "occasion"
  | "weather"
  | "comfort"
  | "cohesion"
  | "completeness"
  | "intent"
  | "fit"
  | "color"
  | "polish"
  | "rotation"
  | "utility";

export type OutfitAssessment = {
  valid: boolean;
  score: number;
  confidence: ConfidenceLevel;
  factorScores: Record<OutfitFactor, number | null>;
  rejectionReasons: string[];
  reasonCodes: string[];
};

export type GovernedOutfit = {
  itemIds: string[];
  composition: CompleteOutfit;
  assessment: OutfitAssessment;
  summary: string;
  rationale: string;
  personalStyle: PersonalStyleAssessment;
  stylingBriefVersion: PersonalStylingBrief["schemaVersion"];
};

export type GovernedRecommendationResult = {
  options: GovernedOutfit[];
  confidence: ConfidenceLevel;
  context: ContextEvidence;
  rejectedCandidateCount: number;
  noRecommendationReason: string | null;
  diagnostics: CandidateDecisionTrace[];
  eligibilityAudit: ItemEligibilityAudit[];
  /**
   * Neutral input boundary only. Preferences do not affect ranking until the
   * Personal Style Survey PRD defines their approved semantics.
   */
  styleProfile: ResolvedStyleProfile;
  stylingBrief: PersonalStylingBrief;
};
