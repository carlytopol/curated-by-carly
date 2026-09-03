import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  completedCoreQuestionIds,
  deriveSurveyStatus,
  validateStyleSurveyAnswer,
} from "@/lib/style-profile/validation";
import {
  STYLE_SURVEY_QUESTIONS,
  STYLE_SURVEY_SCHEMA_VERSION,
} from "@/lib/style-profile/survey-schema";
import { explicitEvidenceFromSurveyAnswers } from "@/lib/style-profile/compatibility";
import type {
  ExplicitPreferenceEvidence,
  FeatureStyleProfile,
  InferredPreferenceEvidence,
  StyleProfileFeature,
  StyleSurveyAnswers,
  StyleSurveyDTO,
} from "@/types/style-profile";

type ResponseRow = {
  id: string;
  schema_version: string;
  status: StyleSurveyDTO["status"];
  answers: StyleSurveyAnswers | null;
  skipped_question_ids: string[] | null;
  started_at: string | null;
  core_completed_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

const EMPTY: StyleSurveyDTO = {
  responseSetId: null,
  schemaVersion: STYLE_SURVEY_SCHEMA_VERSION,
  status: "not_started",
  answers: {},
  completedCoreQuestionIds: [],
  skippedQuestionIds: [],
  startedAt: null,
  coreCompletedAt: null,
  completedAt: null,
  updatedAt: null,
  learningEnabled: false,
  noticed: [],
};

export async function getStyleSurvey(
  userId: string,
  databaseClient?: SupabaseClient,
): Promise<StyleSurveyDTO> {
  const supabase = databaseClient ?? await createClient();
  const [response, settings, inferred] = await Promise.all([
    supabase.from("style_survey_response_sets").select("id,schema_version,status,answers,skipped_question_ids,started_at,core_completed_at,completed_at,updated_at").eq("user_id", userId).eq("schema_version", STYLE_SURVEY_SCHEMA_VERSION).neq("status", "archived").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("style_learning_settings").select("learning_enabled").eq("user_id", userId).maybeSingle(),
    supabase.from("inferred_style_preferences").select("id,subject,value,confidence,evidence_summary,review_state,updated_at").eq("user_id", userId).in("review_state", ["proposed", "confirmed"]).order("updated_at", { ascending: false }),
  ]);
  const error = response.error || settings.error || inferred.error;
  if (error) throw new Error(`Style Profile query failed: ${error.message}`);
  if (!response.data) return { ...EMPTY, learningEnabled: settings.data?.learning_enabled === true };
  const row = response.data as ResponseRow;
  const answers = row.answers ?? {};
  return {
    responseSetId: row.id,
    schemaVersion: row.schema_version,
    status: row.status,
    answers,
    completedCoreQuestionIds: completedCoreQuestionIds(answers, row.skipped_question_ids ?? []),
    skippedQuestionIds: row.skipped_question_ids ?? [],
    startedAt: row.started_at,
    coreCompletedAt: row.core_completed_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
    learningEnabled: settings.data?.learning_enabled === true,
    noticed: (inferred.data ?? []).map((item) => ({
      id: item.id,
      subject: item.subject,
      value: item.value,
      confidence: item.confidence === "high" ? "well_supported" : item.confidence === "medium" ? "emerging" : "early",
      evidenceSummary: item.evidence_summary,
      reviewState: item.review_state,
      updatedAt: item.updated_at,
    })),
  };
}

export async function saveStyleSurveyAnswer(userId: string, questionId: string, rawValue: unknown, skipped = false) {
  const validation = skipped ? null : validateStyleSurveyAnswer(questionId, rawValue);
  if (validation && !validation.success) throw new Error(validation.error);
  const current = await getStyleSurvey(userId);
  const now = new Date().toISOString();
  const responseSetId = current.responseSetId ?? randomUUID();
  const answers = { ...current.answers };
  const skippedIds = new Set(current.skippedQuestionIds);
  if (skipped) {
    delete answers[questionId];
    skippedIds.add(questionId);
  } else {
    answers[questionId] = validation!.value;
    skippedIds.delete(questionId);
  }
  const status = deriveSurveyStatus(answers, [...skippedIds]);
  const supabase = await createClient();
  const { error } = await supabase.from("style_survey_response_sets").upsert({
    id: responseSetId,
    user_id: userId,
    schema_version: STYLE_SURVEY_SCHEMA_VERSION,
    status,
    answers,
    skipped_question_ids: [...skippedIds],
    started_at: current.startedAt ?? now,
    core_completed_at: status === "core_complete" || status === "complete" ? current.coreCompletedAt ?? now : null,
    completed_at: status === "complete" ? current.completedAt ?? now : null,
    updated_at: now,
  }, { onConflict: "id" });
  if (error) throw new Error(`Style Notes save failed: ${error.message}`);

  const isPrivateNote = ["q21_trusted_brands", "q22_references", "q24_good_day"].includes(questionId);
  if (isPrivateNote) {
    await supabase.from("explicit_style_notes")
      .update({ active: false, superseded_at: now })
      .eq("user_id", userId).eq("question_id", questionId).eq("active", true);
  } else {
    await supabase.from("explicit_style_preferences")
      .update({ active: false, superseded_at: now })
      .eq("user_id", userId).eq("subject", questionId).eq("active", true);
  }
  if (!skipped && isPrivateNote) {
    const { error: noteError } = await supabase.from("explicit_style_notes").insert({
      id: randomUUID(),
      user_id: userId,
      response_set_id: responseSetId,
      question_id: questionId,
      note: String(validation!.value),
      active: true,
    });
    if (noteError) throw new Error(`Explicit style note save failed: ${noteError.message}`);
  } else if (!skipped) {
    const { error: preferenceError } = await supabase.from("explicit_style_preferences").insert({
      id: randomUUID(), user_id: userId, response_set_id: responseSetId,
      question_id: questionId, subject: questionId, value: validation!.value,
      scope: {}, provenance: "survey", schema_version: STYLE_SURVEY_SCHEMA_VERSION,
      version: Date.now(), active: true, effective_at: now,
    });
    if (preferenceError) throw new Error(`Explicit preference save failed: ${preferenceError.message}`);
  }
  return getStyleSurvey(userId);
}

const DRESS_ALLOWED = new Set(["q1_balance","q2_everyday_polish","q3_occasion_polish","q4_casual_elevated","q5_style_words","q6_silhouette","q7_fit","q8_colors_enjoy","q9_colors_avoid","q10_patterns","q11_comfort","q12_footwear","q13_weather","q14_priorities","q15_materials","q16_accessories","q17_bags","q18_branding","q20_garment_roles"]);
const PACKING_ALLOWED = new Set(["q1_balance","q2_everyday_polish","q3_occasion_polish","q7_fit","q11_comfort","q12_footwear","q13_weather","q14_priorities","q15_materials","q17_bags","q20_garment_roles"]);
const SHOPPER_ALLOWED = new Set(STYLE_SURVEY_QUESTIONS.map((q) => q.id));

export async function resolveFeatureStyleProfile(
  userId: string,
  feature: StyleProfileFeature,
  databaseClient?: SupabaseClient,
): Promise<FeatureStyleProfile> {
  const allowed = feature === "dress-my-day" ? DRESS_ALLOWED : feature === "packing" ? PACKING_ALLOWED : SHOPPER_ALLOWED;
  const supabase = databaseClient ?? await createClient();
  const [survey, explicitResult, inferredResult] = await Promise.all([
    getStyleSurvey(userId, supabase),
    supabase.from("explicit_style_preferences").select("id,question_id,subject,value,scope,provenance,effective_at,version").eq("user_id", userId).eq("active", true).in("question_id", [...allowed]),
    supabase.from("inferred_style_preferences").select("id,subject,value,scope,confidence,evidence_summary,review_state").eq("user_id", userId).eq("review_state", "confirmed").eq("active", true),
  ]);
  const error = explicitResult.error || inferredResult.error;
  if (error) throw new Error(`Style Profile resolution failed: ${error.message}`);
  const normalizedExplicit: ExplicitPreferenceEvidence[] = (explicitResult.data ?? []).map((item) => ({
    id: item.id,
    questionId: item.question_id,
    subject: item.subject,
    value: item.value,
    scope: item.scope ?? {},
    provenance: item.provenance,
    effectiveAt: item.effective_at,
    version: item.version,
  }));
  const explicit = explicitEvidenceFromSurveyAnswers({
    survey,
    allowedQuestionIds: allowed,
    normalized: normalizedExplicit,
  });
  const explicitSubjects = new Set(explicit.map((item) => item.subject));
  const inferred: InferredPreferenceEvidence[] = (inferredResult.data ?? []).map((item) => ({
    id: item.id,
    subject: item.subject,
    value: item.value,
    scope: item.scope ?? {},
    confidence: item.confidence,
    evidenceSummary: item.evidence_summary,
    reviewState: item.review_state,
  }))
    .filter((item) => allowed.has(item.subject) && !explicitSubjects.has(item.subject));
  return {
    userId,
    schemaVersion: survey.schemaVersion,
    responseStatus: survey.status,
    explicit,
    inferred,
    preferenceVersionIds: explicit.map((item) => `${item.id}:${item.version}`),
    learningEnabled: survey.learningEnabled === true,
  };
}

export async function setStyleLearning(userId: string, enabled: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("style_learning_settings").upsert({
    user_id: userId, learning_enabled: enabled, updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Learning preference save failed: ${error.message}`);
}

export async function clearStyleSurvey(userId: string) {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const results = await Promise.all([
    supabase.from("style_survey_response_sets").update({ status: "archived", updated_at: now }).eq("user_id", userId).neq("status", "archived"),
    supabase.from("explicit_style_preferences").update({ active: false, superseded_at: now }).eq("user_id", userId).eq("active", true),
  ]);
  const error = results.find((result) => result.error)?.error;
  if (error) throw new Error(`Style Notes reset failed: ${error.message}`);
}
