import assert from "node:assert/strict";
import test from "node:test";
import {
  EVIDENCE_REFERENCE_VERSION,
  projectPersonalOutfitMemory,
  type EvidenceRef,
  type OutfitMemoryObservation,
} from "@/lib/recommendations/v2";

const now = "2026-07-29T16:00:00.000Z";
const evidence = (id: string, ownerUserId = "customer-a"): EvidenceRef => ({
  schemaVersion: EVIDENCE_REFERENCE_VERSION,
  evidenceId: id,
  ownerUserId,
  authority: "customer-durable",
  sourceType: "outfit-memory",
  sourceVersion: "fixture.v1",
  confidence: "high",
  observedAt: now,
  effectiveFrom: null,
  effectiveUntil: null,
});
const observation = (
  kind: OutfitMemoryObservation["kind"],
  outfitId: string,
  evidenceId: string,
): OutfitMemoryObservation => ({
  ownerUserId: "customer-a",
  kind,
  outfitId,
  foundation: "top-bottom",
  itemIds: ["top-1", "bottom-1", "shoes-1"],
  occasion: "school-community",
  observedAt: now,
  confidence: "high",
  evidenceRef: evidence(evidenceId),
});

test("Personal Outfit Memory distinguishes meaningful behavior from mere recommendation exposure", () => {
  const snapshot = projectPersonalOutfitMemory({
    artifactId: "memory-a",
    artifactRevision: "1",
    requestId: "request-a",
    ownerUserId: "customer-a",
    generatedAt: now,
    observations: [
      observation("recommended", "outfit-exposure", "exposure"),
      observation("worn", "outfit-confirmed", "worn"),
      observation("approved", "outfit-confirmed", "approved"),
      observation("rejected", "outfit-rejected", "rejected"),
    ],
  });
  assert.equal(snapshot.weakExposureSignals.length, 1);
  assert.equal(snapshot.confirmedCombinations.length, 1);
  assert.equal(snapshot.confirmedCombinations[0]?.wornCount, 1);
  assert.equal(snapshot.confirmedCombinations[0]?.approvedCount, 1);
  assert.equal(snapshot.rejectedCombinations.length, 1);
});

test("Personal Outfit Memory fails closed on cross-customer observations", () => {
  const foreign = observation("worn", "foreign", "foreign");
  foreign.ownerUserId = "customer-b";
  foreign.evidenceRef = evidence("foreign", "customer-b");
  assert.throws(() => projectPersonalOutfitMemory({
    artifactId: "memory-a",
    artifactRevision: "1",
    requestId: "request-a",
    ownerUserId: "customer-a",
    generatedAt: now,
    observations: [foreign],
  }), /owner mismatch/);
});
