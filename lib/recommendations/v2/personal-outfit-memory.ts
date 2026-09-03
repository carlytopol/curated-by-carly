import { MEMORY_SNAPSHOT_VERSION } from "./contracts";
import { RECOMMENDATION_V2_TAXONOMY_VERSION, type Confidence, type EvidenceRef, type OutfitFoundationKind } from "./taxonomy";

export const PERSONAL_OUTFIT_MEMORY_PROJECTOR_VERSION = "personal-outfit-memory-projector.v2.1.0" as const;

export type OutfitMemoryObservation = {
  ownerUserId: string;
  kind: "recommended" | "worn" | "approved" | "rejected" | "corrected" | "archived-look";
  outfitId: string;
  foundation: OutfitFoundationKind;
  itemIds: string[];
  occasion: string | null;
  observedAt: string;
  confidence: Confidence;
  evidenceRef: EvidenceRef;
};

export type PersonalOutfitMemorySnapshot = {
  schemaVersion: typeof MEMORY_SNAPSHOT_VERSION;
  taxonomyVersion: typeof RECOMMENDATION_V2_TAXONOMY_VERSION;
  artifactId: string; artifactRevision: string; requestId: string; ownerUserId: string; generatedAt: string;
  evidenceRefs: EvidenceRef[];
  confirmedFoundations: Array<{ foundation: OutfitFoundationKind; count: number; evidenceRefs: EvidenceRef[] }>;
  confirmedCombinations: Array<{ itemIds: string[]; occasions: string[]; wornCount: number; approvedCount: number; evidenceRefs: EvidenceRef[] }>;
  rejectedCombinations: Array<{ itemIds: string[]; occasions: string[]; evidenceRefs: EvidenceRef[] }>;
  weakExposureSignals: Array<{ itemIds: string[]; count: number; evidenceRefs: EvidenceRef[] }>;
};

export function projectPersonalOutfitMemory(input: {
  artifactId: string; artifactRevision: string; requestId: string; ownerUserId: string; generatedAt: string;
  observations: OutfitMemoryObservation[];
}): PersonalOutfitMemorySnapshot {
  if (input.observations.some((item) => item.ownerUserId !== input.ownerUserId)) throw new Error("Outfit memory owner mismatch");
  const byOutfit = new Map<string, OutfitMemoryObservation[]>();
  for (const item of input.observations) byOutfit.set(item.outfitId, [...(byOutfit.get(item.outfitId) ?? []), item]);
  const combinations = [...byOutfit.values()].map((records) => {
    const meaningful = records.filter((item) => ["worn", "approved", "archived-look"].includes(item.kind));
    const rejected = records.filter((item) => ["rejected", "corrected"].includes(item.kind));
    return { records, meaningful, rejected };
  });
  const meaningful = combinations.filter((group) => group.meaningful.length);
  const foundationCounts = new Map<OutfitFoundationKind, OutfitMemoryObservation[]>();
  for (const group of meaningful) for (const item of group.meaningful) {
    foundationCounts.set(item.foundation, [...(foundationCounts.get(item.foundation) ?? []), item]);
  }
  const evidenceRefs = [...new Map(input.observations.map((item) => [item.evidenceRef.evidenceId, item.evidenceRef])).values()];
  return {
    schemaVersion: MEMORY_SNAPSHOT_VERSION,
    taxonomyVersion: RECOMMENDATION_V2_TAXONOMY_VERSION,
    artifactId: input.artifactId, artifactRevision: input.artifactRevision, requestId: input.requestId,
    ownerUserId: input.ownerUserId, generatedAt: input.generatedAt, evidenceRefs,
    confirmedFoundations: [...foundationCounts].map(([foundation, records]) => ({
      foundation, count: records.length, evidenceRefs: records.map((item) => item.evidenceRef),
    })),
    confirmedCombinations: meaningful.map(({ meaningful: records }) => ({
      itemIds: records[0].itemIds, occasions: [...new Set(records.flatMap((item) => item.occasion ? [item.occasion] : []))],
      wornCount: records.filter((item) => item.kind === "worn").length,
      approvedCount: records.filter((item) => ["approved", "archived-look"].includes(item.kind)).length,
      evidenceRefs: records.map((item) => item.evidenceRef),
    })),
    rejectedCombinations: combinations.filter((group) => group.rejected.length).map(({ rejected }) => ({
      itemIds: rejected[0].itemIds, occasions: [...new Set(rejected.flatMap((item) => item.occasion ? [item.occasion] : []))],
      evidenceRefs: rejected.map((item) => item.evidenceRef),
    })),
    weakExposureSignals: combinations.filter((group) => !group.meaningful.length && !group.rejected.length).map(({ records }) => ({
      itemIds: records[0].itemIds, count: records.length, evidenceRefs: records.map((item) => item.evidenceRef),
    })),
  };
}

