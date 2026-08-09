import assert from "node:assert/strict";
import test from "node:test";
import {
  appendEventCorrection,
  durablePolishCorrection,
  eventCorrectionFromQuestion,
  followUpOnlyRequestsVisibleOptions,
  followUpRequiresNewOutfits,
} from "@/lib/recommendations/follow-up";
import {
  followUpSubmissionReducer,
  formatRegeneratedOptionsForChat,
  initialFollowUpSubmissionState,
  shouldSubmitFollowUpOnKey,
  suggestedFollowUpAction,
} from "@/lib/recommendations/follow-up-state";

test("typed prompt remains visible while its authenticated request is pending", () => {
  const drafted = followUpSubmissionReducer(initialFollowUpSubmissionState, {
    type: "draft",
    value: "Please replace the shoes.",
  });
  const pending = followUpSubmissionReducer(drafted, {
    type: "submit",
    text: drafted.draft,
    notice: "Curated is considering your follow-up…",
  });
  assert.equal(pending.phase, "loading");
  assert.equal(pending.draft, "Please replace the shoes.");
  assert.equal(pending.pendingText, "Please replace the shoes.");
  assert.deepEqual(pending.messages, []);
});

test("Enter submits through the shared path while Shift+Enter remains multiline", () => {
  assert.equal(shouldSubmitFollowUpOnKey({
    key: "Enter",
    shiftKey: false,
    isComposing: false,
  }), true);
  assert.equal(shouldSubmitFollowUpOnKey({
    key: "Enter",
    shiftKey: true,
    isComposing: false,
  }), false);
  assert.equal(shouldSubmitFollowUpOnKey({
    key: "Enter",
    shiftKey: false,
    isComposing: true,
  }), false);
});

test("suggested corrections submit immediately and custom correction focuses the field", () => {
  assert.equal(suggestedFollowUpAction("Too formal / too relaxed"), "submit");
  assert.equal(suggestedFollowUpAction("An item is unavailable"), "submit");
  assert.equal(suggestedFollowUpAction("Something else"), "focus-custom");
});

test("expired session preserves the exact prompt and exposes a retryable error", () => {
  const pending = followUpSubmissionReducer(initialFollowUpSubmissionState, {
    type: "submit",
    text: "Could I wear flats instead?",
    notice: "Loading",
  });
  const expired = followUpSubmissionReducer(pending, {
    type: "fail",
    notice: "Your session has expired. Sign in again; your question is still here.",
  });
  assert.equal(expired.phase, "error");
  assert.equal(expired.draft, "Could I wear flats instead?");
  assert.equal(expired.pendingText, null);
  assert.match(expired.notice, /session has expired/i);
});

test("ordinary API failure never clears or falsely posts the prompt", () => {
  const pending = followUpSubmissionReducer(initialFollowUpSubmissionState, {
    type: "submit",
    text: "This top does not work.",
    notice: "Loading",
  });
  const failed = followUpSubmissionReducer(pending, {
    type: "fail",
    notice: "Curated could not review this follow-up.",
  });
  assert.equal(failed.draft, "This top does not work.");
  assert.deepEqual(failed.messages, []);
});

test("successful correction posts both messages, clears the composer, and requests new outfits", () => {
  const pending = followUpSubmissionReducer(initialFollowUpSubmissionState, {
    type: "submit",
    text: "This is too formal; please try again.",
    notice: "Loading",
  });
  const succeeded = followUpSubmissionReducer(pending, {
    type: "succeed",
    answer: "I agree. I will compose a more relaxed complete look.",
    notice: "Your correction has been applied to three new outfit options.",
  });
  assert.equal(succeeded.phase, "success");
  assert.equal(succeeded.draft, "");
  assert.deepEqual(succeeded.messages, [
    { role: "user", content: "This is too formal; please try again." },
    { role: "assistant", content: "I agree. I will compose a more relaxed complete look." },
  ]);
  assert.equal(followUpRequiresNewOutfits("This is too formal; please try again."), true);
});

test("duplicate submission is ignored while a prompt is already loading", () => {
  const pending = followUpSubmissionReducer(initialFollowUpSubmissionState, {
    type: "submit",
    text: "First request",
    notice: "Loading",
  });
  const duplicate = followUpSubmissionReducer(pending, {
    type: "submit",
    text: "Second request",
    notice: "Loading again",
  });
  assert.equal(duplicate, pending);
});

test("event-specific corrections are recognized and retained with user provenance", () => {
  for (const correction of [
    "No jeans—it will be over 90 degrees.",
    "The slides are too casual.",
    "Make it more polished.",
    "I need secure pockets.",
    "No long sleeves.",
  ]) {
    assert.equal(followUpRequiresNewOutfits(correction), true);
    assert.equal(eventCorrectionFromQuestion(correction), correction);
  }
  const saved = appendEventCorrection("Original event note", "No jeans—it will be over 90 degrees.");
  assert.match(saved, /Original event note/);
  assert.match(saved, /\[User styling correction\] No jeans/);
  assert.equal(appendEventCorrection(saved, "No jeans—it will be over 90 degrees."), saved);
});

test("too fancy and too dressy are authoritative polish corrections", () => {
  for (const correction of [
    "This dress is too fancy for my lunch appointment.",
    "That outfit is too dressy for an ordinary daytime plan.",
  ]) {
    assert.equal(followUpRequiresNewOutfits(correction), true);
    assert.equal(eventCorrectionFromQuestion(correction), correction);
    assert.equal(durablePolishCorrection(correction, "Lunch appointment")?.value, "easy_considered");
  }
});

test("a failed school-volunteering recommendation is recognized as a regeneration correction", () => {
  const correction = "These are completely the wrong choices. I said I was volunteering at a school and you submitted formal wear. I said comfortable shoes and you provided heels. I want three additional choices that better match what I asked for.";
  assert.equal(followUpRequiresNewOutfits(correction), true);
  assert.equal(eventCorrectionFromQuestion(correction), correction);
});

test("the exact mobile Ask Curated correction requests three replacement options", () => {
  const correction = "These are pants and heels. The Xirena dress or denim cutoffs and a cute tank with Gucci slides is a better look. Give me three better options";
  assert.equal(followUpRequiresNewOutfits(correction), true);
  assert.equal(eventCorrectionFromQuestion(correction), correction);
});

test("asking to see rebuilt options in chat regenerates without polluting styling corrections", () => {
  const request = "I want to see the new options in this chat, always";
  assert.equal(followUpRequiresNewOutfits(request), true);
  assert.equal(followUpOnlyRequestsVisibleOptions(request), true);
  assert.equal(eventCorrectionFromQuestion(request), null);
});

test("rebuilt outfits are rendered as visible chat options", () => {
  const answer = formatRegeneratedOptionsForChat([
    {
      summary: "Polished summer ease",
      rationale: "Wear the linen shell, tailored shorts, and walkable leather sandals.",
      wardrobeItems: [],
    },
    {
      summary: "An easy dress",
      rationale: null,
      wardrobeItems: [{ label: "Cotton dress" }, { label: "Leather sneakers" }],
    },
  ]);
  assert.match(answer, /Option 1: Wear the linen shell/);
  assert.match(answer, /Option 2: Cotton dress, Leather sneakers/);
});
