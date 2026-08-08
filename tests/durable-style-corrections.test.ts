import assert from "node:assert/strict";
import test from "node:test";
import { durablePolishCorrection } from "@/lib/recommendations/follow-up";

test("a clear Considered correction becomes occasion-scoped future style memory", () => {
  assert.deepEqual(
    durablePolishCorrection(
      "This is too formal. Make future lunch looks more casual but still considered.",
      "Lunch and shopping with friends",
    ),
    {
      questionId: "q3_occasion_polish",
      subject: "confirmed-correction:polish:social",
      value: "easy_considered",
      scope: { occasion: "social" },
    },
  );
});

test("temporary event constraints do not become global polish preferences", () => {
  assert.equal(
    durablePolishCorrection("No jeans today because it will be 95 degrees.", "Outdoor lunch"),
    null,
  );
});

test("formal occasionwear rejection becomes a dinner-scoped considered correction", () => {
  assert.deepEqual(
    durablePolishCorrection(
      "These are formal dresses and should not be worn unless the occasion calls for it.",
      "Dinner nearby",
    ),
    {
      questionId: "q3_occasion_polish",
      subject: "confirmed-correction:polish:dinner",
      value: "easy_considered",
      scope: { occasion: "dinner" },
    },
  );
});
