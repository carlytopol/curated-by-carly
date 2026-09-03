import assert from "node:assert/strict";
import test from "node:test";
import { parseOutfitRecommendationResult, parseOutfitRecommendationSet } from "../lib/ai/outfit-recommendation-result";

test("accepts a complete structured wardrobe recommendation", () => {
  assert.deepEqual(parseOutfitRecommendationResult(JSON.stringify({
    summary: "Silk blouse with tailored trousers",
    rationale: "Polished and comfortable.",
    wardrobeItemIds: ["blouse-id", "trouser-id"],
  })), {
    summary: "Silk blouse with tailored trousers",
    rationale: "Polished and comfortable.",
    wardrobeItemIds: ["blouse-id", "trouser-id"],
  });
});

test("accepts one primary and one alternative", () => {
  const options = [1, 2].map((number) => ({
    summary: `Option ${number}`,
    rationale: "Distinct and appropriate.",
    wardrobeItemIds: [`item-${number}`],
  }));
  const threeOptions = [...options, { summary: "Third", rationale: "Another complete look.", wardrobeItemIds: ["item-3"] }];
  assert.deepEqual(parseOutfitRecommendationSet(JSON.stringify({ options: threeOptions })), threeOptions);
  assert.equal(parseOutfitRecommendationSet(JSON.stringify({ options })), null);
  assert.equal(parseOutfitRecommendationSet(JSON.stringify({ options: [...threeOptions, options[0]] })), null);
});

test("rejects empty or truncated recommendation output", () => {
  assert.equal(parseOutfitRecommendationResult(""), null);
  assert.equal(parseOutfitRecommendationResult('{"summary":"Incomplete"'), null);
});
