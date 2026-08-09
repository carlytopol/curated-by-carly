import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Change something opens and focuses its correction composer without changing the URL hash", () => {
  const workspace = fs.readFileSync("app/today/_components/today-workspace.tsx", "utf8");
  assert.match(workspace, /function openConsideredCorrection/);
  assert.match(workspace, /correction\.open = true/);
  assert.match(workspace, /question\.focus\(\{ preventScroll: true \}\)/);
  assert.match(workspace, /onClick=\{\(\) => openConsideredCorrection\(activeRecommendation\.id\)\}/);
  assert.doesNotMatch(workspace, /href=\{`#change-\$\{activeRecommendation\.id\}`\}/);
});
