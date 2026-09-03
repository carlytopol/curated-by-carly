import assert from "node:assert/strict";
import test from "node:test";
import { explicitEvidenceFromSurveyAnswers } from "../lib/style-profile/compatibility";
import type { StyleSurveyDTO } from "../types/style-profile";

const survey: StyleSurveyDTO = {
  responseSetId: "response-1",
  schemaVersion: "2026-07-28.v1",
  status: "in_progress",
  answers: {
    q2_everyday_polish: "polished_casual",
    q23_budget: "considered",
  },
  completedCoreQuestionIds: [],
  skippedQuestionIds: [],
  startedAt: "2026-07-28T10:00:00.000Z",
  coreCompletedAt: null,
  completedAt: null,
  updatedAt: "2026-07-29T10:00:00.000Z",
  noticed: [],
};

test("legacy survey answers remain visible to the feature resolver", () => {
  const evidence = explicitEvidenceFromSurveyAnswers({
    survey,
    allowedQuestionIds: new Set(["q2_everyday_polish"]),
    normalized: [],
  });
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].questionId, "q2_everyday_polish");
  assert.equal(evidence[0].value, "polished_casual");
  assert.equal(evidence[0].provenance, "survey");
});

test("normalized explicit evidence wins without duplicating survey answers", () => {
  const normalized = [{
    id: "explicit-1",
    questionId: "q2_everyday_polish",
    subject: "q2_everyday_polish",
    value: "polished",
    scope: {},
    provenance: "survey" as const,
    effectiveAt: "2026-07-29T11:00:00.000Z",
    version: 2,
  }];
  const evidence = explicitEvidenceFromSurveyAnswers({
    survey,
    allowedQuestionIds: new Set(["q2_everyday_polish"]),
    normalized,
  });
  assert.deepEqual(evidence, normalized);
});

test("feature boundaries still exclude unrelated survey answers", () => {
  const evidence = explicitEvidenceFromSurveyAnswers({
    survey,
    allowedQuestionIds: new Set(["q23_budget"]),
    normalized: [],
  });
  assert.deepEqual(evidence.map((item) => item.questionId), ["q23_budget"]);
});
