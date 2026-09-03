import assert from "node:assert/strict";
import test from "node:test";
import { attachCanonicalGarmentEvidence, projectGarmentEvidenceForConsumer } from "@/lib/recommendations/evidence/projection";
import { assessEvidenceSufficiency } from "@/lib/recommendations/evidence/sufficiency";
import { auditWardrobeMetadata } from "@/lib/wardrobe/metadata-audit";
import { planMetadataEnrichment } from "@/lib/wardrobe/metadata-enrichment";

const item = {
  id: "item-1",
  item_name: "Sleeveless cotton day dress",
  department: "Women",
  category: "Dresses",
  subcategory: "Day Dresses",
  color: "Navy",
  availability_status: "available",
};

const suggestion = (field_name: string, suggested_value: string | boolean, confidence: number, status = "inferred") => ({
  id: `${field_name}-${confidence}`,
  clothing_item_id: item.id,
  field_name: field_name as never,
  suggested_value,
  confidence,
  evidence: "Visible or supplied garment evidence.",
  provenance: "ai-inference",
  model_version: "test-model",
  status,
  updated_at: "2026-07-28T12:00:00.000Z",
});

test("high-confidence enrichment fills unknowns while low-confidence facts remain unknown", () => {
  const [enriched] = attachCanonicalGarmentEvidence({
    ownerUserId: "user-a",
    wardrobe: [item],
    suggestions: [
      suggestion("breathability", "5", 0.94),
      suggestion("rain_tolerance", "2", 0.62, "needs_review"),
    ],
  });
  assert.equal(enriched.garmentEvidence.fields.breathability?.state, "known");
  assert.equal(enriched.garmentEvidence.fields.breathability?.provenance, "bounded-ai-inference");
  assert.equal(enriched.garmentEvidence.fields.rain_tolerance?.state, "unknown");
});

test("confirmed customer metadata outranks and cannot be overwritten by inference", () => {
  const [enriched] = attachCanonicalGarmentEvidence({
    ownerUserId: "user-a",
    wardrobe: [item],
    suggestions: [suggestion("category", "Swimwear", 0.99)],
  });
  assert.equal(enriched.garmentEvidence.fields.category?.value, "Dresses");
  assert.equal(enriched.garmentEvidence.fields.category?.provenance, "user-confirmed");
});

test("consumer projections originate from the same canonical evidence", () => {
  const [enriched] = attachCanonicalGarmentEvidence({
    ownerUserId: "user-a",
    wardrobe: [item],
    suggestions: [suggestion("breathability", "5", 0.94)],
  });
  const dressMyDay = projectGarmentEvidenceForConsumer(enriched.garmentEvidence, "dress-my-day");
  const travel = projectGarmentEvidenceForConsumer(enriched.garmentEvidence, "travel");
  const shopper = projectGarmentEvidenceForConsumer(enriched.garmentEvidence, "personal-shopper");
  assert.deepEqual(dressMyDay, travel);
  assert.deepEqual(travel, shopper);
});

test("cross-user evidence fails closed", () => {
  const [enriched] = attachCanonicalGarmentEvidence({
    ownerUserId: "user-a",
    wardrobe: [item],
  });
  assert.throws(
    () => assessEvidenceSufficiency({
      ownerUserId: "user-b",
      garments: [enriched.garmentEvidence],
    }),
    /ownership/i,
  );
});

test("metadata audit measures canonical decision-critical completeness before and after", () => {
  const [beforeItem] = attachCanonicalGarmentEvidence({
    ownerUserId: "user-a",
    wardrobe: [item],
  });
  const [afterItem] = attachCanonicalGarmentEvidence({
    ownerUserId: "user-a",
    wardrobe: [item],
    suggestions: [
      suggestion("breathability", "5", 0.94),
      suggestion("rain_tolerance", "2", 0.9),
      suggestion("standing_tolerance", "4", 0.91),
      suggestion("pocket_function", "secure", 0.95),
      suggestion("mobility", "unrestricted", 0.92),
    ],
  });
  const before = auditWardrobeMetadata([beforeItem]);
  const after = auditWardrobeMetadata([afterItem]);
  assert.ok(after.decisionCriticalCompleteness.known > before.decisionCriticalCompleteness.known);
  assert.ok(after.decisionCriticalCompleteness.reliable > before.decisionCriticalCompleteness.reliable);
});

test("only low-confidence inferences are routed for founder review", () => {
  const plan = planMetadataEnrichment(
    { id: "item-1", category: "Dresses" },
    [
      { field: "category", value: "Tops", confidence: 0.99, evidence: "Guess", provenance: "ai-inference" },
      { field: "material", value: "cotton", confidence: 0.93, evidence: "Visible weave", provenance: "ai-inference" },
      { field: "has_pockets", value: true, confidence: 0.61, evidence: "Possible seam", provenance: "ai-inference" },
    ],
  );
  assert.deepEqual(plan.ignoredBecauseConfirmed.map((entry) => entry.field), ["category"]);
  assert.deepEqual(plan.acceptedInferences.map((entry) => entry.field), ["material"]);
  assert.deepEqual(plan.needsReview.map((entry) => entry.field), ["has_pockets"]);
});
