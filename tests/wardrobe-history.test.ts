import assert from "node:assert/strict";
import test from "node:test";
import { buildWardrobeHistoryNotes } from "../lib/history/wardrobe-history";
import { buildFitCheckStoragePath, historyCoverPath } from "../lib/history/fit-check-photo";

test("preserves the styling rationale and event details in Wardrobe History", () => {
  assert.equal(
    buildWardrobeHistoryNotes({
      rationale: "A polished linen look for a warm afternoon.",
      location: "The garden terrace",
      dressCode: "Smart casual",
    }),
    "A polished linen look for a warm afternoon.\nLocation: The garden terrace\nDress code: Smart casual",
  );
});

test("omits empty optional history details", () => {
  assert.equal(buildWardrobeHistoryNotes({ rationale: "  Elegant and weather-ready.  " }), "Elegant and weather-ready.");
});

test("stores fit-check photos in a user-scoped private path", () => {
  assert.equal(
    buildFitCheckStoragePath({
      userId: "user-123",
      recommendationId: "recommendation-456",
      assetId: "asset-789",
      extension: "jpeg",
    }),
    "user-123/fit-checks/recommendation-456/asset-789.jpg",
  );
});

test("transfers a saved fit-check path to the history cover", () => {
  assert.equal(historyCoverPath(" user-123/fit-checks/recommendation/asset.jpg "), "user-123/fit-checks/recommendation/asset.jpg");
  assert.equal(historyCoverPath(null), null);
});
