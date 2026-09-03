import assert from "node:assert/strict";
import test from "node:test";
import {
  CORE_STYLE_QUESTION_IDS,
  STYLE_SURVEY_QUESTIONS,
} from "@/lib/style-profile/survey-schema";
import {
  deriveSurveyStatus,
  validateStyleSurveyAnswer,
} from "@/lib/style-profile/validation";
import { toEngineStyleProfile } from "@/lib/recommendations/engine/style-profile";
import type { StyleSurveyAnswers } from "@/types/style-profile";

test("the published survey keeps 14 core questions and 10 optional questions", () => {
  assert.equal(CORE_STYLE_QUESTION_IDS.length, 14);
  assert.equal(STYLE_SURVEY_QUESTIONS.length, 24);
  assert.equal(new Set(STYLE_SURVEY_QUESTIONS.map((question) => question.id)).size, 24);
});

test("each optional written refinement accepts 2,000 characters", () => {
  const writtenQuestions = STYLE_SURVEY_QUESTIONS.filter(
    (question) => question.kind === "text",
  );
  assert.equal(writtenQuestions.length, 4);
  assert.ok(writtenQuestions.every((question) => question.maxLength === 2_000));

  for (const question of writtenQuestions) {
    assert.equal(validateStyleSurveyAnswer(question.id, "a".repeat(2_000)).success, true);
    assert.equal(validateStyleSurveyAnswer(question.id, "a".repeat(2_001)).success, false);
  }
});

test("survey progress requires every core answer and validates unknown fields", () => {
  assert.equal(validateStyleSurveyAnswer("not-a-question", "x").success, false);
  const answers: StyleSurveyAnswers = Object.fromEntries(CORE_STYLE_QUESTION_IDS.map((id) => [id, id === "q13_weather" ? { heat: "very_sensitive" } : ["answer"]]));
  answers.q1_balance = "equally_true";
  answers.q2_everyday_polish = "4";
  answers.q3_occasion_polish = "4";
  answers.q4_casual_elevated = "somewhat_more_b";
  answers.q13_weather = { heat: "very_sensitive" };
  assert.equal(deriveSurveyStatus(answers), "core_complete");
});

test("feature profile conversion preserves explicit evidence without inferred overwrite", () => {
  const snapshot = toEngineStyleProfile({
    userId: "user-a",
    schemaVersion: "v1",
    responseStatus: "core_complete",
    preferenceVersionIds: ["explicit-1:1"],
    explicit: [{
      id: "explicit-1",
      questionId: "q8_colors_enjoy",
      subject: "q8_colors_enjoy",
      value: ["navy"],
      scope: {},
      provenance: "survey",
      effectiveAt: "2026-07-28T18:00:00.000Z",
      version: 1,
    }],
    inferred: [{
      id: "inferred-1",
      subject: "q8_colors_enjoy",
      value: "orange",
      scope: {},
      confidence: "high",
      evidenceSummary: "Observed once",
      reviewState: "confirmed",
    }],
  });
  assert.deepEqual(snapshot.preferences.map((item) => item.value), ["navy"]);
  assert.equal(snapshot.userId, "user-a");
});

test("Profile resolution preserves rank, polarity, occasion, role, confidence, and provenance", () => {
  const snapshot = toEngineStyleProfile({
    userId: "user-structured",
    schemaVersion: "v1",
    responseStatus: "complete",
    preferenceVersionIds: ["ranked:4", "reserved:2"],
    explicit: [
      {
        id: "ranked",
        questionId: "q17_bags",
        subject: "q17_bags",
        value: ["hands_free", "secure_closure"],
        scope: { occasion: "travel" },
        provenance: "survey",
        effectiveAt: "2026-07-28T18:00:00.000Z",
        version: 4,
      },
      {
        id: "reserved",
        questionId: "q20_garment_roles",
        subject: "q20_garment_roles",
        value: { casual_basics: "reserved" },
        scope: { occasion: "errands" },
        provenance: "confirmed-correction",
        effectiveAt: "2026-07-28T18:00:00.000Z",
        version: 2,
      },
    ],
    inferred: [{
      id: "inferred",
      subject: "q12_footwear",
      value: "walkable footwear",
      scope: { occasion: "travel" },
      confidence: "low",
      evidenceSummary: "A tentative pattern",
      reviewState: "confirmed",
    }],
  });

  const ranked = snapshot.preferences.filter((item) => item.questionId === "q17_bags");
  assert.deepEqual(ranked.map((item) => item.rank), [1, 2]);
  assert.deepEqual(ranked[0].occasions, ["travel"]);
  const reserved = snapshot.preferences.find((item) => item.questionId === "q20_garment_roles");
  assert.equal(reserved?.polarity, "required");
  assert.deepEqual(reserved?.garmentRoles, ["casual-basics"]);
  assert.equal(reserved?.provenance, "confirmed-correction");
  const inferred = snapshot.preferences.find((item) => item.id === "inferred");
  assert.equal(inferred?.authority, "inferred-low");
  assert.equal(inferred?.confidence, "low");
  assert.deepEqual(inferred?.occasions, ["travel"]);
});
