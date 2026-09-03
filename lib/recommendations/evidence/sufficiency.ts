import type { ConfidenceLevel } from "@/types/daily-agenda";
import {
  EVIDENCE_SUFFICIENCY_VERSION,
  type EvidenceSufficiencyReport,
  type GarmentEvidence,
  type GarmentEvidenceField,
  type SufficiencyDimension,
} from "./contracts";

const DIMENSIONS: Record<SufficiencyDimension, GarmentEvidenceField[]> = {
  context: ["occasion", "formality"],
  garment: ["role", "category", "formality"],
  environment: ["material", "fabric_weight", "warmth", "breathability", "rain_tolerance"],
  movement: ["walkability", "standing_tolerance", "mobility", "has_pockets"],
  "personal-style": [],
  availability: ["availability"],
  "combination-history": [],
};

export function assessEvidenceSufficiency(input: {
  ownerUserId: string;
  garments: GarmentEvidence[];
  personalStyleEvidenceCount?: number;
  combinationEvidenceCount?: number;
  assessedAt?: string;
}): EvidenceSufficiencyReport {
  if (input.garments.some((item) => item.ownerUserId !== input.ownerUserId)) {
    throw new Error("Garment Evidence ownership mismatch.");
  }
  const dimensions = {} as EvidenceSufficiencyReport["dimensions"];
  for (const [dimension, fields] of Object.entries(DIMENSIONS) as Array<[SufficiencyDimension, GarmentEvidenceField[]]>) {
    if (dimension === "personal-style" || dimension === "combination-history") {
      const count = dimension === "personal-style"
        ? input.personalStyleEvidenceCount ?? 0
        : input.combinationEvidenceCount ?? 0;
      dimensions[dimension] = {
        state: count > 0 ? "sufficient" : "conditional",
        reliable: count, unknown: count ? 0 : 1, conflicted: 0,
        coveragePercent: count ? 100 : 0,
        reasonCodes: count ? [] : [`${dimension.replace("-", "_")}_not_observed`],
      };
      continue;
    }
    const values = input.garments.flatMap((garment) =>
      fields.map((field) => garment.fields[field]).filter(Boolean)
    );
    const reliable = values.filter((value) =>
      value!.state === "known" && value!.numericConfidence >= 0.7
    ).length;
    const conflicted = values.filter((value) => value!.state === "conflicted").length;
    const unknown = values.length - reliable - conflicted;
    const coveragePercent = values.length ? Math.round(reliable / values.length * 100) : 0;
    dimensions[dimension] = {
      state: conflicted ? "insufficient" : coveragePercent >= 90 ? "sufficient" : "conditional",
      reliable, unknown, conflicted, coveragePercent,
      reasonCodes: [
        ...(conflicted ? [`${dimension}_conflicted`] : []),
        ...(coveragePercent < 90 ? [`${dimension}_coverage_below_90`] : []),
      ],
    };
  }
  const values = Object.values(dimensions);
  const hasInsufficient = values.some((dimension) => dimension.state === "insufficient");
  const criticalCoverage = Math.min(
    dimensions.garment.coveragePercent,
    dimensions.environment.coveragePercent,
    dimensions.movement.coveragePercent,
    dimensions.availability.coveragePercent,
  );
  const confidenceCap: ConfidenceLevel =
    hasInsufficient || criticalCoverage < 50 ? "low"
      : criticalCoverage < 90 ? "medium" : "high";
  return {
    schemaVersion: EVIDENCE_SUFFICIENCY_VERSION,
    ownerUserId: input.ownerUserId,
    assessedAt: input.assessedAt ?? new Date().toISOString(),
    dimensions,
    overall: hasInsufficient ? "ask" : confidenceCap === "high" ? "proceed" : "conditional",
    confidenceCap,
    focusedQuestion: hasInsufficient
      ? "One wardrobe detail needs your confirmation before Curated can rely on it."
      : null,
  };
}
