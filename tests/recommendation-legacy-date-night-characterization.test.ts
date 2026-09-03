import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

type LegacyFixture = {
  authoritativeSuppressions: Array<{ itemId: string; active: boolean; persisted: boolean }>;
  legacyRecommendations: Array<{
    option: number;
    foundation: string[];
    support: string[];
    explanation: string;
  }>;
  expectedLegacyViolations: string[];
};

const fixturePath = path.join(
  process.cwd(),
  "tests/fixtures/recommendations/date-night-suppression-legacy.json",
);
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as LegacyFixture;

function characterizeKnownLegacyViolations(value: LegacyFixture) {
  const activeSuppressedItems = new Set(
    value.authoritativeSuppressions
      .filter((item) => item.active && item.persisted)
      .map((item) => item.itemId),
  );
  const recommendations = value.legacyRecommendations;
  const supportSignatures = recommendations.map((item) => [...item.support].sort().join("|"));
  const explanations = recommendations.map((item) => item.explanation.trim().toLowerCase());
  const violations = new Set<string>();

  if (recommendations.some((look) => look.foundation.some((itemId) => activeSuppressedItems.has(itemId)))) {
    violations.add("active-suppression-bypassed");
  }
  if (recommendations.some((look) => look.foundation.some((itemId) => /utility|casual-(ribbed|scoop)-tank/.test(itemId)))) {
    violations.add("alternative-relaxes-event-brief");
  }
  if (new Set(supportSignatures).size === 1) violations.add("automatic-support-piece-template");
  if (new Set(explanations).size === 1) violations.add("generic-or-unsupported-explanation");
  if (recommendations.length === 3 && recommendations.some((look) => look.foundation.some((itemId) => /utility|casual-/.test(itemId)))) {
    violations.add("forced-three-options");
  }
  if (new Set(supportSignatures).size === 1 && new Set(explanations).size === 1) {
    violations.add("alternatives-not-materially-distinct");
  }
  return [...violations].sort();
}

test("legacy characterization detector passes by documenting known blocked behavior; legacy quality does not pass", () => {
  assert.deepEqual(
    characterizeKnownLegacyViolations(fixture),
    [...fixture.expectedLegacyViolations].sort(),
  );
});
