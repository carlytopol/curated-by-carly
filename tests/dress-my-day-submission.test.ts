import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDailyEventPayload,
  hasUsableRecommendationOptions,
  initialPlanSubmissionState,
  planSubmissionReducer,
  shouldSubmitPlanOnEnter,
  type PlanDraft,
} from "../lib/dress-my-day/submission";

const draft: PlanDraft = {
  title: "Client meeting and dinner",
  time: "17:30",
  location: "The St. Regis Atlanta",
  dressCode: "Polished cocktail",
  notes: "Walk six blocks after the meeting.\nBring a light layer.",
};

test("Enter submits while Shift+Enter creates a new line", () => {
  assert.equal(shouldSubmitPlanOnEnter({ key: "Enter", shiftKey: false, isComposing: false }), true);
  assert.equal(shouldSubmitPlanOnEnter({ key: "Enter", shiftKey: true, isComposing: false }), false);
  assert.equal(shouldSubmitPlanOnEnter({ key: "Enter", shiftKey: false, isComposing: true }), false);
  assert.equal(shouldSubmitPlanOnEnter({ key: "a", shiftKey: false, isComposing: false }), false);
});

test("submitted plans remain visible while saving and generating", () => {
  const saving = planSubmissionReducer(initialPlanSubmissionState, { type: "submit", draft });
  assert.equal(saving.phase, "saving");
  assert.deepEqual(saving.draft, draft);

  const generating = planSubmissionReducer(saving, { type: "saved", eventId: "event-1" });
  assert.equal(generating.phase, "generating");
  assert.deepEqual(generating.draft, draft);
  assert.equal(generating.eventId, "event-1");

  const success = planSubmissionReducer(generating, { type: "recommendations-ready" });
  assert.equal(success.phase, "success");
  assert.deepEqual(success.draft, draft);
});

test("failed submissions preserve exact text and expose a retryable event", () => {
  const saving = planSubmissionReducer(initialPlanSubmissionState, { type: "submit", draft });
  const failure = planSubmissionReducer(saving, {
    type: "failed",
    error: "The stylist connection was interrupted.",
    eventId: "event-1",
  });
  assert.equal(failure.phase, "error");
  assert.deepEqual(failure.draft, draft);
  assert.equal(failure.eventId, "event-1");
  assert.match(failure.error ?? "", /interrupted/);
});

test("daily event request payload contains the typed plans", () => {
  assert.deepEqual(
    buildDailyEventPayload(draft, "2026-07-16", "2026-07-16T21:30:00.000Z"),
    {
      eventDate: "2026-07-16",
      startsAt: "2026-07-16T21:30:00.000Z",
      title: draft.title,
      location: draft.location,
      dressCode: draft.dressCode,
      notes: draft.notes,
    },
  );
});

test("the client accepts one to three governed options and rejects malformed sets", () => {
  assert.equal(hasUsableRecommendationOptions([{}]), true);
  assert.equal(hasUsableRecommendationOptions([{}, {}]), true);
  assert.equal(hasUsableRecommendationOptions([{}, {}, {}]), true);
  assert.equal(hasUsableRecommendationOptions([]), false);
  assert.equal(hasUsableRecommendationOptions([{}, {}, {}, {}]), false);
  assert.equal(hasUsableRecommendationOptions(null), false);
});
