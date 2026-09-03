import {
  CORE_STYLE_QUESTION_IDS,
  STYLE_QUESTION_IDS,
  STYLE_SURVEY_QUESTIONS,
} from "./survey-schema";
import type { StyleSurveyAnswerValue, StyleSurveyAnswers } from "@/types/style-profile";

const MAX_SERIALIZED_ANSWER_BYTES = 12_000;

function isAnswerValue(value: unknown): value is StyleSurveyAnswerValue {
  if (typeof value === "string") return true;
  if (Array.isArray(value)) return value.every((entry) => typeof entry === "string");
  if (!value || typeof value !== "object") return false;
  return Object.values(value).every((entry) =>
    entry === null ||
    typeof entry === "string" ||
    typeof entry === "number" ||
    typeof entry === "boolean" ||
    (Array.isArray(entry) && entry.every((item) => typeof item === "string"))
  );
}

export function validateStyleSurveyAnswer(questionId: string, value: unknown) {
  const question = STYLE_SURVEY_QUESTIONS.find((entry) => entry.id === questionId);
  if (!question || !STYLE_QUESTION_IDS.has(questionId)) return { success: false as const, error: "This Style Notes question is not recognized." };
  if (!isAnswerValue(value)) return { success: false as const, error: "This answer could not be saved." };
  if (Buffer.byteLength(JSON.stringify(value), "utf8") > MAX_SERIALIZED_ANSWER_BYTES) {
    return { success: false as const, error: "This answer is too long to save safely." };
  }
  if (question.kind === "text" && (typeof value !== "string" || value.length > (question.maxLength ?? 500))) {
    return { success: false as const, error: `Keep this note to ${question.maxLength ?? 500} characters.` };
  }
  if ((question.kind === "multi" || question.kind === "ranked") && !Array.isArray(value)) {
    return { success: false as const, error: "Choose one or more of the listed answers." };
  }
  if (Array.isArray(value) && question.max && value.length > question.max) {
    return { success: false as const, error: `Choose no more than ${question.max}.` };
  }
  return { success: true as const, value };
}

export function completedCoreQuestionIds(answers: StyleSurveyAnswers, skipped: string[] = []) {
  return CORE_STYLE_QUESTION_IDS.filter((id) => {
    const value = answers[id];
    if (skipped.includes(id) || value == null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return Object.keys(value).length > 0;
  });
}

export function deriveSurveyStatus(answers: StyleSurveyAnswers, skipped: string[] = []) {
  const answered = Object.keys(answers).filter((id) => STYLE_QUESTION_IDS.has(id));
  if (!answered.length && !skipped.length) return "not_started" as const;
  const coreComplete = completedCoreQuestionIds(answers, skipped).length === CORE_STYLE_QUESTION_IDS.length;
  if (!coreComplete) return "in_progress" as const;
  const allOptionalAnswered = STYLE_SURVEY_QUESTIONS.filter((q) => !q.core).every((q) => answers[q.id] != null || skipped.includes(q.id));
  return allOptionalAnswered ? "complete" as const : "core_complete" as const;
}
