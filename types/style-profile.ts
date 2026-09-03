export const STYLE_SURVEY_SCHEMA_VERSION = "2026-07-28.v1";

export type StyleSurveyStatus =
  | "not_started"
  | "in_progress"
  | "core_complete"
  | "complete"
  | "archived";

export type StyleSurveyAnswerValue =
  | string
  | string[]
  | Record<string, string | string[] | number | boolean | null>;

export type StyleSurveyAnswers = Record<string, StyleSurveyAnswerValue>;

export type StyleSurveyDTO = {
  responseSetId: string | null;
  schemaVersion: string;
  status: StyleSurveyStatus;
  answers: StyleSurveyAnswers;
  completedCoreQuestionIds: string[];
  skippedQuestionIds: string[];
  startedAt: string | null;
  coreCompletedAt: string | null;
  completedAt: string | null;
  updatedAt: string | null;
  learningEnabled?: boolean;
  noticed: Array<{
    id: string;
    subject: string;
    value: string;
    confidence: "early" | "emerging" | "well_supported";
    evidenceSummary: string;
    reviewState: "proposed" | "confirmed" | "dismissed" | "deferred";
    updatedAt: string;
  }>;
};

export type StyleProfileFeature = "dress-my-day" | "personal-shopper" | "packing";

export type ExplicitPreferenceEvidence = {
  id: string;
  questionId: string;
  subject: string;
  value: StyleSurveyAnswerValue;
  scope: Record<string, string>;
  provenance: "survey" | "confirmed-correction";
  effectiveAt: string;
  version: number;
};

export type InferredPreferenceEvidence = {
  id: string;
  subject: string;
  value: string;
  scope: Record<string, string>;
  confidence: "low" | "medium" | "high";
  evidenceSummary: string;
  reviewState: "proposed" | "confirmed";
};

export type FeatureStyleProfile = {
  userId: string;
  schemaVersion: string;
  responseStatus: StyleSurveyStatus;
  explicit: ExplicitPreferenceEvidence[];
  inferred: InferredPreferenceEvidence[];
  preferenceVersionIds: string[];
  learningEnabled?: boolean;
};
