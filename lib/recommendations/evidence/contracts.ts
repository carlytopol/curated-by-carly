import type { ConfidenceLevel } from "@/types/daily-agenda";

export const GARMENT_EVIDENCE_VERSION = "garment-evidence.v1" as const;
export const EVIDENCE_SUFFICIENCY_VERSION = "evidence-sufficiency.v1" as const;

export type EvidenceState =
  | "known"
  | "unknown"
  | "conflicted"
  | "stale"
  | "not-applicable";

export type GarmentEvidenceProvenance =
  | "user-confirmed"
  | "verified-metadata"
  | "derived-rule"
  | "bounded-ai-inference"
  | "unknown";

export type CorrectionAuthority =
  | "user"
  | "verified-source"
  | "system-derived"
  | "inference"
  | "none";

export type EvidenceConsumer =
  | "dress-my-day"
  | "personal-shopper"
  | "travel"
  | "wardrobe-audit"
  | "explanation";

export type EvidenceSource = {
  sourceType: GarmentEvidenceProvenance;
  sourceId: string;
  observedAt: string | null;
  modelVersion?: string | null;
};

export type GarmentEvidenceValue<T> = {
  schemaVersion: typeof GARMENT_EVIDENCE_VERSION;
  ownerUserId: string;
  clothingItemId: string;
  field: GarmentEvidenceField;
  state: EvidenceState;
  value: T | null;
  provenance: GarmentEvidenceProvenance;
  confidence: ConfidenceLevel;
  numericConfidence: number;
  authoritativeSource: EvidenceSource;
  correctionAuthority: CorrectionAuthority;
  correctionHistory: Array<{
    sourceId: string;
    correctedAt: string;
    previousValue: unknown;
  }>;
  effectiveAt: string | null;
  expiresAt: string | null;
  permittedConsumers: EvidenceConsumer[];
};

export type GarmentEvidenceField =
  | "role"
  | "category"
  | "subcategory"
  | "formality"
  | "silhouette"
  | "fit_behavior"
  | "material"
  | "fabric_weight"
  | "warmth"
  | "breathability"
  | "rain_tolerance"
  | "walkability"
  | "standing_tolerance"
  | "has_pockets"
  | "pocket_function"
  | "mobility"
  | "occasion"
  | "pattern"
  | "branding_intensity"
  | "availability";

export type GarmentEvidence = {
  schemaVersion: typeof GARMENT_EVIDENCE_VERSION;
  ownerUserId: string;
  clothingItemId: string;
  generatedAt: string;
  fields: Partial<Record<GarmentEvidenceField, GarmentEvidenceValue<unknown>>>;
};

export type SufficiencyDimension =
  | "context"
  | "garment"
  | "environment"
  | "movement"
  | "personal-style"
  | "availability"
  | "combination-history";

export type EvidenceSufficiencyReport = {
  schemaVersion: typeof EVIDENCE_SUFFICIENCY_VERSION;
  ownerUserId: string;
  assessedAt: string;
  dimensions: Record<SufficiencyDimension, {
    state: "sufficient" | "conditional" | "insufficient";
    reliable: number;
    unknown: number;
    conflicted: number;
    coveragePercent: number;
    reasonCodes: string[];
  }>;
  overall: "proceed" | "conditional" | "ask" | "abstain";
  confidenceCap: ConfidenceLevel;
  focusedQuestion: string | null;
};

export const ALL_EVIDENCE_CONSUMERS: EvidenceConsumer[] = [
  "dress-my-day",
  "personal-shopper",
  "travel",
  "wardrobe-audit",
  "explanation",
];
