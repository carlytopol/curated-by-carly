import type {
  ExplicitPreferenceEvidence,
  StyleSurveyDTO,
} from "@/types/style-profile";

/**
 * Compatibility bridge for survey responses saved before normalized preference
 * rows were introduced. The survey response remains authoritative; normalized
 * rows win when both exist.
 */
export function explicitEvidenceFromSurveyAnswers(input: {
  survey: StyleSurveyDTO;
  allowedQuestionIds: Set<string>;
  normalized: ExplicitPreferenceEvidence[];
}): ExplicitPreferenceEvidence[] {
  const normalizedQuestions = new Set(input.normalized.map((item) => item.questionId));
  const effectiveAt = input.survey.updatedAt
    ?? input.survey.startedAt
    ?? new Date(0).toISOString();
  const fallbackVersion = Math.max(0, Date.parse(effectiveAt) || 0);
  const responseSetId = input.survey.responseSetId ?? "survey";
  const compatibilityRows = Object.entries(input.survey.answers)
    .filter(([questionId]) =>
      input.allowedQuestionIds.has(questionId) && !normalizedQuestions.has(questionId)
    )
    .map(([questionId, value]) => ({
      id: `${responseSetId}:${questionId}:compat`,
      questionId,
      subject: questionId,
      value,
      scope: {},
      provenance: "survey" as const,
      effectiveAt,
      version: fallbackVersion,
    }));
  return [...input.normalized, ...compatibilityRows];
}
