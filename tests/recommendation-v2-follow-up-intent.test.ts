import assert from "node:assert/strict";
import test from "node:test";

import {
  requestsRecommendationRestoration,
  requestsRecommendationSuppression,
} from "@/lib/recommendations/v2/follow-up-intent";

test("recognizes natural suppression language used by the Founder flow", () => {
  assert.equal(
    requestsRecommendationSuppression(
      "Take the Straw boater hat with striped band out of recommendation rotation.",
    ),
    true,
  );
  assert.equal(
    requestsRecommendationSuppression("Do not recommend the Straw boater hat."),
    true,
  );
});

test("keeps restoration distinct from suppression", () => {
  assert.equal(
    requestsRecommendationRestoration(
      "Restore the Straw boater hat with striped band to recommendations.",
    ),
    true,
  );
  assert.equal(
    requestsRecommendationSuppression(
      "Restore the Straw boater hat with striped band to recommendations.",
    ),
    false,
  );
});
