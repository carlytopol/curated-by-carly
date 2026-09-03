import assert from "node:assert/strict";
import test from "node:test";
import { auditWardrobeMetadata } from "@/lib/wardrobe/metadata-audit";
import { planMetadataEnrichment } from "@/lib/wardrobe/metadata-enrichment";
import { buildOutfitKnowledgeEdges } from "@/lib/recommendations/knowledge-graph";

test("wardrobe metadata audit identifies missing, conflicting, duplicate, and low-confidence records", () => {
  const audit = auditWardrobeMetadata([
    {
      id: "one", designer: "Maison", item_name: "Blue dress", department: "Women",
      category: "Dresses", subcategory: "Day Dresses", color: "Blue", size: "4",
      analysis_metadata: { confidence: 0.45 },
    },
    {
      id: "two", designer: "Maison", item_name: "Blue dress", department: "Women",
      category: "Dresses", subcategory: "Day Dresses", color: "Blue", size: "4",
    },
    {
      id: "three", department: "Women", category: "Shoes", subcategory: "T-Shirts",
      item_name: null,
    },
  ], "2026-07-28T12:00:00.000Z");
  assert.ok(audit.missingMetadata.some((issue) => issue.itemId === "three" && issue.field === "item_name"));
  assert.ok(audit.conflictingMetadata.some((issue) => issue.itemId === "three" && issue.field === "subcategory"));
  assert.deepEqual(audit.duplicateItems[0].itemIds, ["one", "two"]);
  assert.ok(audit.lowConfidenceClassifications.some((issue) => issue.itemId === "one"));
  assert.ok(audit.itemsNeedingManualReview.includes("three"));
});

test("metadata enrichment never overwrites confirmed data and flags only low-confidence inference", () => {
  const plan = planMetadataEnrichment(
    { id: "item-1", color: "Ivory", material: null },
    [
      { field: "color", value: "White", confidence: 0.99, evidence: "Visible", provenance: "ai-inference" },
      { field: "material", value: "Linen", confidence: 0.91, evidence: "Visible weave", provenance: "ai-inference" },
      { field: "occasion", value: "Dinner", confidence: 0.42, evidence: "Silhouette", provenance: "ai-inference" },
    ],
  );
  assert.equal(plan.ignoredBecauseConfirmed[0].field, "color");
  assert.equal(plan.acceptedInferences[0].field, "material");
  assert.equal(plan.needsReview[0].field, "occasion");
});

test("outfit knowledge graph keeps user evidence scoped and models successful, occasion, color, and footwear relationships", () => {
  const edges = buildOutfitKnowledgeEdges("user-a", [
    {
      id: "look-1", itemIds: ["top", "bottom", "shoe"], occasion: "Dinner",
      occurredAt: "2026-07-01T18:00:00Z", outcome: "worn",
      colorsByItemId: { top: "Ivory", bottom: "Navy", shoe: "Tan" },
      footwearItemIds: ["shoe"],
    },
  ]);
  assert.ok(edges.every((edge) => edge.userId === "user-a"));
  assert.ok(edges.some((edge) => edge.relationship === "successful-combination"));
  assert.ok(edges.some((edge) => edge.relationship === "occasion-specific-combination"));
  assert.ok(edges.some((edge) => edge.relationship === "color-relationship"));
  assert.ok(edges.some((edge) => edge.relationship === "footwear-relationship"));
});
