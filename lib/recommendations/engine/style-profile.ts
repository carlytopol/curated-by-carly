import type { ConfidenceLevel } from "@/types/daily-agenda";
import type { FeatureStyleProfile, StyleSurveyAnswerValue } from "@/types/style-profile";
import type { ContextEvidence, EngineWardrobeItem } from "./types";
import { classifyWardrobeTraits } from "./item-taxonomy";

export const PERSONAL_STYLING_BRIEF_VERSION = "personal-styling-brief.v1" as const;

export type StylePreferenceProvenance =
  | "explicit-current"
  | "survey"
  | "profile-edit"
  | "confirmed-correction"
  | "outfit-feedback"
  | "inferred"
  | "wardrobe-evidence"
  | "behavioral-signal";

export type StylePreferencePolarity =
  | "prefer"
  | "avoid"
  | "required"
  | "neutral"
  | "varies"
  | "not-applicable";

export type StylePreferenceAuthority =
  | "explicit-current"
  | "explicit-confirmed"
  | "inferred-high"
  | "inferred-medium"
  | "inferred-low";

export type StylePreferenceDimension =
  | "intention"
  | "polish"
  | "aesthetic"
  | "silhouette"
  | "fit"
  | "color"
  | "pattern"
  | "comfort"
  | "footwear"
  | "weather"
  | "material"
  | "accessory"
  | "bag"
  | "branding"
  | "garment-role"
  | "wardrobe-priority"
  | "combination";

export type StylePreference = {
  id: string;
  subject: string;
  questionId: string | null;
  dimension: StylePreferenceDimension;
  value: string;
  polarity: StylePreferencePolarity;
  rank: number | null;
  garmentRoles: string[];
  occasions: string[];
  scope: Record<string, string>;
  provenance: StylePreferenceProvenance;
  authority: StylePreferenceAuthority;
  confidence: ConfidenceLevel;
  recordedAt: string;
};

export type StyleProfileSnapshot = {
  userId: string;
  version: string;
  status: "empty" | "active";
  preferences: StylePreference[];
  updatedAt: string;
};

export type ProfileNotesInput = {
  styleNotes?: string | null;
  fitNotes?: string | null;
  proportions?: string | null;
  updatedAt?: string | null;
};

export type ResolvedStyleProfile = {
  ownerUserId: string | null;
  version: string | null;
  status: "not-provided" | "empty" | "active";
  preferences: StylePreference[];
};

export type PersonalStyleDirective = {
  id: string;
  kind:
    | "polish"
    | "rank"
    | "avoid"
    | "require"
    | "reserve"
    | "combination"
    | "observe";
  dimension: StylePreferenceDimension;
  value: string;
  polarity: StylePreferencePolarity;
  authority: StylePreferenceAuthority;
  confidence: ConfidenceLevel;
  garmentRoles: string[];
  occasions: string[];
  provenance: StylePreferenceProvenance;
  sourcePreferenceIds: string[];
  vetoEligible: boolean;
};

export type PersonalStylingBrief = {
  schemaVersion: typeof PERSONAL_STYLING_BRIEF_VERSION;
  profileVersion: string | null;
  ownerUserId: string | null;
  requestKey: string;
  occasion: string;
  desiredPolish: "casual" | "polished-casual" | "polished" | "formal" | "neutral";
  neutral: boolean;
  explicitCurrentInstructions: string[];
  directives: PersonalStyleDirective[];
  wardrobeEvidence: WardrobeEvidenceSummary;
  reconciliation: StyleEvidenceReconciliation;
};

export type WardrobeEvidenceSource =
  | "wardrobe-composition"
  | "confirmed-worn-outfit"
  | "recommendation-approval"
  | "recommendation-rejection"
  | "confirmed-correction"
  | "behavioral-pattern";

export type WardrobeEvidenceProvenance = {
  source: WardrobeEvidenceSource;
  recordIds: string[];
  observationCount: number;
};

export type WardrobeEvidenceInference<T> = {
  id: string;
  value: T;
  confidence: ConfidenceLevel;
  provenance: WardrobeEvidenceProvenance[];
  /** Evidence can guide ranking but is never an explicit-answer replacement. */
  advisoryOnly: true;
};

export type WardrobeEvidenceSummary = {
  ownerUserId: string | null;
  dominantSilhouettes: WardrobeEvidenceInference<string>[];
  recurringColorFamilies: WardrobeEvidenceInference<string>[];
  materialPatterns: WardrobeEvidenceInference<string>[];
  formalityDistribution: WardrobeEvidenceInference<{ level: number | null; count: number; share: number }>[];
  occasionDistribution: WardrobeEvidenceInference<{ occasion: string; count: number; share: number }>[];
  frequentlyWornCombinations: WardrobeEvidenceInference<{ itemIds: string[]; count: number }>[];
  highConfidenceBehavioralPatterns: WardrobeEvidenceInference<string>[];
  underusedProfileAlignedItems: WardrobeEvidenceInference<{ itemId: string; matchedPreferenceIds: string[] }>[];
  repeatedlyRejectedInContexts: WardrobeEvidenceInference<{ itemId: string; occasion: string; reason: string; count: number }>[];
};

export type StyleEvidenceConflict = {
  dimension: StylePreferenceDimension;
  explicitPreferenceIds: string[];
  evidenceInferenceIds: string[];
  resolution: "preserve-explicit" | "lower-confidence" | "ask-focused-question";
  question: string | null;
};

export type StyleEvidenceReconciliation = {
  conflicts: StyleEvidenceConflict[];
  focusedQuestion: string | null;
};

export type WornOutfitEvidence = {
  id: string;
  itemIds: string[];
  occasion: string | null;
  wornAt: string;
};

export type RecommendationFeedbackEvidence = {
  id: string;
  itemIds: string[];
  occasion: string | null;
  status: string;
  occurredAt: string;
  reason?: string | null;
};

export type BehavioralStyleEvidence = {
  id: string;
  subject: string;
  value: string;
  context: Record<string, string>;
  strength: ConfidenceLevel;
  sourceRecordType: string;
  sourceRecordId: string | null;
};

export type WardrobeEvidenceInput = {
  userId: string;
  wardrobe: EngineWardrobeItem[];
  wornOutfits?: WornOutfitEvidence[];
  recommendationFeedback?: RecommendationFeedbackEvidence[];
  behavioralSignals?: BehavioralStyleEvidence[];
};

export type PersonalStyleAssessment = {
  briefVersion: typeof PERSONAL_STYLING_BRIEF_VERSION;
  score: number;
  personalPolishScore: number | null;
  cohesionScore: number | null;
  matchedDirectiveIds: string[];
  conflictingDirectiveIds: string[];
  rejectionReasons: string[];
};

const dimensionByQuestion: Record<string, StylePreferenceDimension> = {
  q1_balance: "intention",
  q2_everyday_polish: "polish",
  q3_occasion_polish: "polish",
  q4_casual_elevated: "combination",
  q5_style_words: "aesthetic",
  q6_silhouette: "silhouette",
  q7_fit: "fit",
  q8_colors_enjoy: "color",
  q9_colors_avoid: "color",
  q10_patterns: "pattern",
  q11_comfort: "comfort",
  q12_footwear: "footwear",
  q13_weather: "weather",
  q14_priorities: "wardrobe-priority",
  q15_materials: "material",
  q16_accessories: "accessory",
  q17_bags: "bag",
  q18_branding: "branding",
  q20_garment_roles: "garment-role",
};

const values = (value: StyleSurveyAnswerValue): Array<{ value: string; key?: string; rank?: number }> => {
  if (typeof value === "string") return [{ value }];
  if (Array.isArray(value)) return value.map((entry, index) => ({ value: entry, rank: index + 1 }));
  return Object.entries(value).flatMap(([key, entry]) => {
    if (entry === true) return [{ key, value: key }];
    if (typeof entry === "string") return [{ key, value: entry }];
    if (Array.isArray(entry)) return entry.map((value, index) => ({ key, value, rank: index + 1 }));
    return [];
  });
};

const normalizedOccasion = (value: string) => {
  const text = value.toLowerCase();
  if (/\b(workout|gym|fitness|tennis|exercise)\b/.test(text)) return "workout";
  if (/\b(errands?|everyday|appointments?)\b/.test(text)) return "errands";
  if (/\b(work|meeting|professional|office)\b/.test(text)) return "work";
  if (/\b(dinner|restaurant|date)\b/.test(text)) return "dinner";
  if (/\b(travel|flight|airport)\b/.test(text)) return "travel";
  if (/\b(wedding|formal|ceremonial|gala)\b/.test(text)) return "formal";
  if (/\b(social|concert|party|lunch)\b/.test(text)) return "social";
  return "other";
};

const roleForSurveyValue = (value: string) => {
  const text = value.toLowerCase();
  if (/\b(activewear|casual_basics|tailoring|outerwear)\b/.test(text)) return [text.replace("_", "-")];
  if (/\bdenim\b/.test(text)) return ["bottom"];
  if (/\bone_piece|dress|jumpsuit\b/.test(text)) return ["one-piece"];
  if (/\bshoe|footwear|heel|sneaker|loafer|flat|boot|sandal\b/.test(text)) return ["shoes"];
  if (/\bbag\b/.test(text)) return ["bag"];
  if (/\b(accessor|jewelry)\b/.test(text)) return ["accessory"];
  return [];
};

function polarity(questionId: string, value: string): StylePreferencePolarity {
  if (questionId === "q9_colors_avoid" && value !== "none") return "avoid";
  if (questionId === "q11_comfort" && value !== "none_consistent") return "required";
  if (questionId === "q20_garment_roles") {
    if (value === "never") return "avoid";
    if (value === "reserved") return "required";
    if (value === "not_applicable") return "not-applicable";
  }
  if (/\b(avoid|never|no_heels|flat_only|do_not_wear)\b/.test(value)) return "avoid";
  if (/\b(varies|depends|context_dependent|not_sure)\b/.test(value)) return "varies";
  if (/\b(none|neutral|neither|no_preference)\b/.test(value)) return "neutral";
  return "prefer";
}

/** Preserves survey structure, scope, authority, confidence, and provenance. */
export function toEngineStyleProfile(profile: FeatureStyleProfile): StyleProfileSnapshot {
  const explicit = profile.explicit.flatMap((entry) =>
    values(entry.value).map(({ value, key, rank }): StylePreference => {
      const questionId = entry.questionId;
      const garmentRoles = questionId === "q20_garment_roles"
        ? roleForSurveyValue(key ?? entry.scope.garmentRole ?? "")
        : questionId === "q7_fit" ? roleForSurveyValue(key ?? "") : [];
      const occasions = [
        entry.scope.occasion,
        questionId === "q3_occasion_polish" ? key : undefined,
        questionId === "q20_garment_roles" ? entry.scope.occasion : undefined,
      ].filter((item): item is string => Boolean(item));
      return {
        id: `${entry.id}:${key ?? value}`,
        subject: entry.subject,
        questionId,
        dimension: dimensionByQuestion[questionId] ?? "aesthetic",
        value,
        polarity: polarity(questionId, value),
        rank: rank ?? null,
        garmentRoles,
        occasions,
        scope: { ...entry.scope, ...(key ? { key } : {}) },
        provenance: entry.provenance === "confirmed-correction" ? "confirmed-correction" : "survey",
        authority: "explicit-confirmed",
        confidence: "high",
        recordedAt: entry.effectiveAt,
      };
    }),
  );
  const explicitSubjects = new Set(profile.explicit.map((entry) => entry.subject));
  const inferred = profile.inferred
    .filter((entry) => !explicitSubjects.has(entry.subject))
    .map((entry): StylePreference => ({
      id: entry.id,
      subject: entry.subject,
      questionId: entry.subject.startsWith("q") ? entry.subject : null,
      dimension: dimensionByQuestion[entry.subject] ?? "aesthetic",
      value: entry.value,
      polarity: "prefer",
      rank: null,
      garmentRoles: roleForSurveyValue(entry.scope.garmentRole ?? entry.value),
      occasions: entry.scope.occasion ? [entry.scope.occasion] : [],
      scope: { ...entry.scope },
      provenance: "inferred",
      authority: entry.confidence === "high"
        ? "inferred-high"
        : entry.confidence === "medium" ? "inferred-medium" : "inferred-low",
      confidence: entry.confidence,
      recordedAt: new Date(0).toISOString(),
    }));
  const preferences = [...explicit, ...inferred];
  return {
    userId: profile.userId,
    version: profile.preferenceVersionIds.join("|") || profile.schemaVersion,
    status: preferences.length ? "active" : "empty",
    preferences,
    updatedAt: new Date().toISOString(),
  };
}

const PROFILE_NOTE_TERMS: Array<{
  value: string;
  pattern: RegExp;
  dimension: StylePreferenceDimension;
  garmentRoles?: string[];
}> = [
  { value: "defined waist", pattern: /\bdefined waist|waist definition|cinched waist\b/, dimension: "fit" },
  { value: "high-rise", pattern: /\bhigh[- ](?:rise|waisted)\b/, dimension: "fit", garmentRoles: ["bottom"] },
  { value: "wide-leg", pattern: /\bwide[- ]leg\b/, dimension: "silhouette", garmentRoles: ["bottom"] },
  { value: "straight-leg", pattern: /\bstraight[- ]leg\b/, dimension: "silhouette", garmentRoles: ["bottom"] },
  { value: "a-line", pattern: /\ba[- ]line\b/, dimension: "silhouette" },
  { value: "bodycon", pattern: /\bbodycon|body[- ]conscious\b/, dimension: "fit" },
  { value: "oversized", pattern: /\boversized|oversize\b/, dimension: "fit" },
  { value: "tailored", pattern: /\btailored|structured\b/, dimension: "fit" },
  { value: "relaxed", pattern: /\brelaxed|loose[- ]fit\b/, dimension: "fit" },
  { value: "tank", pattern: /\btanks?|camisoles?\b/, dimension: "garment-role", garmentRoles: ["top"] },
  { value: "jeans", pattern: /\bjeans?|denim pants?\b/, dimension: "garment-role", garmentRoles: ["bottom"] },
  { value: "shorts", pattern: /\bshorts\b/, dimension: "garment-role", garmentRoles: ["bottom"] },
  { value: "skirts", pattern: /\bskirts?\b/, dimension: "garment-role", garmentRoles: ["bottom"] },
  { value: "dresses", pattern: /\bdresses?\b/, dimension: "garment-role", garmentRoles: ["one-piece"] },
  { value: "heels", pattern: /\bheels?|pumps?|stilettos?\b/, dimension: "footwear", garmentRoles: ["shoes"] },
  { value: "flats", pattern: /\bflats?|flat shoes?\b/, dimension: "footwear", garmentRoles: ["shoes"] },
  { value: "linen", pattern: /\blinen\b/, dimension: "material" },
  { value: "cotton", pattern: /\bcotton\b/, dimension: "material" },
  { value: "silk", pattern: /\bsilk\b/, dimension: "material" },
  { value: "polished", pattern: /\bpolished|put together\b/, dimension: "aesthetic" },
  { value: "classic", pattern: /\bclassic|timeless\b/, dimension: "aesthetic" },
  { value: "expressive", pattern: /\bexpressive|playful|creative\b/, dimension: "aesthetic" },
];

function notePolarity(text: string, matchIndex: number) {
  const nearby = text.slice(Math.max(0, matchIndex - 64), matchIndex);
  const prefix = nearby.split(/[.;!?]/).at(-1) ?? nearby;
  return /\b(?:avoid|never|no|not|dislike|hate|don['’]?t|do not|cannot|can['’]?t)\b/.test(prefix)
    ? "avoid" as const
    : "prefer" as const;
}

/** Converts only recognized customer-authored Profile language into traceable directives. */
export function withProfileNotes(
  snapshot: StyleProfileSnapshot,
  userId: string,
  input: ProfileNotesInput | null | undefined,
): StyleProfileSnapshot {
  if (!input || snapshot.userId !== userId) return snapshot;
  const recordedAt = input.updatedAt || snapshot.updatedAt;
  const sources = [
    ["style", input.styleNotes],
    ["fit", input.fitNotes],
    ["proportions", input.proportions],
  ] as const;
  const preferences: StylePreference[] = [];
  for (const [source, raw] of sources) {
    const text = raw?.trim().toLowerCase();
    if (!text) continue;
    for (const term of PROFILE_NOTE_TERMS) {
      const match = term.pattern.exec(text);
      if (!match) continue;
      const polarity = notePolarity(text, match.index);
      preferences.push({
        id: `profile-note:${source}:${term.value}`,
        subject: `profile-note:${source}`,
        questionId: null,
        dimension: term.dimension,
        value: term.value,
        polarity,
        rank: null,
        garmentRoles: [...(term.garmentRoles ?? [])],
        occasions: [],
        scope: { source },
        provenance: "profile-edit",
        authority: "explicit-confirmed",
        confidence: "high",
        recordedAt,
      });
    }
  }
  if (!preferences.length) return snapshot;
  const priorIds = new Set(snapshot.preferences.map((preference) => preference.id));
  const additions = preferences.filter((preference) => !priorIds.has(preference.id));
  return {
    ...snapshot,
    version: `${snapshot.version}|profile-notes:${recordedAt}`,
    status: "active",
    preferences: [...snapshot.preferences, ...additions],
    updatedAt: recordedAt,
  };
}

export function resolveStyleProfile(
  snapshot: StyleProfileSnapshot | undefined,
  requestUserId?: string,
): ResolvedStyleProfile {
  if (!snapshot) return { ownerUserId: null, version: null, status: "not-provided", preferences: [] };
  if (!requestUserId || snapshot.userId !== requestUserId) {
    throw new Error("Style Profile ownership does not match the recommendation request.");
  }
  return {
    ownerUserId: snapshot.userId,
    version: snapshot.version,
    status: snapshot.status,
    preferences: snapshot.status === "active" ? snapshot.preferences.map((item) => ({
      ...item,
      garmentRoles: [...item.garmentRoles],
      occasions: [...item.occasions],
      scope: { ...item.scope },
    })) : [],
  };
}

function requestedPolish(context: ContextEvidence, preferences: StylePreference[]) {
  const explicit = `${context.intention.value ?? ""} ${context.statedDressCode.value ?? ""} ${context.userNotes.value ?? ""}`.toLowerCase();
  const rejectsFormal = /\bnon[- ]?formal\b|\b(?:not|isn['’]?t|avoid|less|too)\s+(?:overly\s+)?formal\b|\bformal\s+(?:dresses?|wear|garments?|pieces?)\b[\s\S]{0,120}\b(?:inappropriate|unsuitable|not appropriate|should\s+not|shouldn['’]?t|avoid|unless)\b/.test(explicit);
  const asksFormal = /\b(black.?tie|gala|formal dress code|dress formally|formal wedding|formal dinner)\b/.test(explicit) && !rejectsFormal;
  if (asksFormal) return "formal" as const;
  if (rejectsFormal) return "polished-casual" as const;
  if (/\bpolished casual|casual polished|smart casual|fun but polished\b/.test(explicit)) return "polished-casual" as const;
  // The posture establishes the occasion before style language is applied.
  // "Polished" at lunch or while shopping means polished-casual, not formal.
  if (/\bpolished|elevated|composed|trendy\b/.test(explicit)) {
    return context.dressingPosture.archetype === "everyday-casual-social"
      ? "polished-casual" as const
      : "polished" as const;
  }
  if (/\bcasual|relaxed|easy\b/.test(explicit)) return "casual" as const;
  const occasion = normalizedOccasion(context.agendaItem.title);
  const preference = preferences.find((item) =>
    item.dimension === "polish" &&
    item.authority === "explicit-confirmed" &&
    (!item.occasions.length || item.occasions.map(normalizedOccasion).includes(occasion))
  );
  if (!preference) return context.dressingPosture.requestedPolish !== "neutral"
    ? context.dressingPosture.requestedPolish
    : context.constraintMatrix.requestedPolish === "relaxed"
    ? "casual"
    : context.constraintMatrix.requestedPolish ?? "neutral";
  if (preference.value === "relaxed") return "casual";
  if (preference.value === "considered" || preference.value === "easy_considered") return "polished-casual";
  if (preference.value === "highly_dressed" || preference.value === "highly_composed") {
    return context.dressingPosture.formalityCeiling >= 5 ? "formal" : "polished";
  }
  if (preference.value === "polished") return "polished";
  return "neutral";
}

export function emptyWardrobeEvidence(ownerUserId: string | null): WardrobeEvidenceSummary {
  return {
    ownerUserId,
    dominantSilhouettes: [],
    recurringColorFamilies: [],
    materialPatterns: [],
    formalityDistribution: [],
    occasionDistribution: [],
    frequentlyWornCombinations: [],
    highConfidenceBehavioralPatterns: [],
    underusedProfileAlignedItems: [],
    repeatedlyRejectedInContexts: [],
  };
}

function evidenceConfidence(count: number, total: number): ConfidenceLevel {
  if (count >= 3 && total > 0 && count / total >= 0.35) return "high";
  if (count >= 2 || (total > 0 && count / total >= 0.2)) return "medium";
  return "low";
}

function topCounts(values: Array<{ value: string; recordId: string }>, source: WardrobeEvidenceSource) {
  const counts = new Map<string, { count: number; recordIds: string[] }>();
  for (const entry of values) {
    const current = counts.get(entry.value) ?? { count: 0, recordIds: [] };
    current.count += 1;
    current.recordIds.push(entry.recordId);
    counts.set(entry.value, current);
  }
  return [...counts]
    .sort((left, right) => right[1].count - left[1].count || left[0].localeCompare(right[0]))
    .slice(0, 6)
    .map(([value, count]) => ({
      id: `wardrobe:${source}:${value}`,
      value,
      confidence: evidenceConfidence(count.count, values.length),
      provenance: [{ source, recordIds: count.recordIds, observationCount: count.count }],
      advisoryOnly: true as const,
    }));
}

function silhouetteFor(item: EngineWardrobeItem) {
  const canonical = item.garmentEvidence?.fields.silhouette;
  if (canonical?.state === "known" && typeof canonical.value === "string") return canonical.value;
  const traits = classifyWardrobeTraits(item);
  const text = traits.text;
  const shape = [
    "wide-leg", "straight-leg", "cropped", "midi", "mini", "maxi", "fitted",
    "relaxed", "oversized", "tailored", "a-line", "wrap", "shift",
  ].find((value) => text.includes(value));
  return shape ?? traits.role;
}

/**
 * Summarizes what this user owns and demonstrably chooses. It is deliberately
 * separate from the Style Profile and cannot create hard exclusions.
 */
export function buildWardrobeEvidenceSummary(
  input: WardrobeEvidenceInput | undefined,
  profile: ResolvedStyleProfile,
): WardrobeEvidenceSummary {
  if (!input) return emptyWardrobeEvidence(profile.ownerUserId);
  if (input.userId !== profile.ownerUserId) {
    throw new Error("Wardrobe Evidence ownership does not match the resolved Style Profile.");
  }
  const byId = new Map(input.wardrobe.map((item) => [item.id, item]));
  const silhouettes = topCounts(input.wardrobe.map((item) => ({
    value: silhouetteFor(item), recordId: item.id,
  })), "wardrobe-composition");
  const colors = topCounts(input.wardrobe.flatMap((item) =>
    item.color ? [{ value: item.color.trim().toLowerCase(), recordId: item.id }] : []
  ), "wardrobe-composition");
  const materials = topCounts(input.wardrobe.flatMap((item) =>
    item.garmentEvidence?.fields.material?.state === "known" &&
    typeof item.garmentEvidence.fields.material.value === "string"
      ? [{ value: item.garmentEvidence.fields.material.value, recordId: item.id }]
      : classifyWardrobeTraits(item).materials.map((value) => ({ value, recordId: item.id }))
  ), "wardrobe-composition");

  const formalityCounts = new Map<number | null, string[]>();
  for (const item of input.wardrobe) {
    const level = classifyWardrobeTraits(item).formality;
    formalityCounts.set(level, [...(formalityCounts.get(level) ?? []), item.id]);
  }
  const formalityDistribution = [...formalityCounts].map(([level, recordIds]) => ({
    id: `wardrobe:formality:${level ?? "unknown"}`,
    value: { level, count: recordIds.length, share: recordIds.length / Math.max(1, input.wardrobe.length) },
    confidence: evidenceConfidence(recordIds.length, input.wardrobe.length),
    provenance: [{ source: "wardrobe-composition" as const, recordIds, observationCount: recordIds.length }],
    advisoryOnly: true as const,
  }));

  const worn = input.wornOutfits ?? [];
  const occasionCounts = new Map<string, string[]>();
  const combinationCounts = new Map<string, { itemIds: string[]; recordIds: string[] }>();
  for (const outfit of worn) {
    const occasion = normalizedOccasion(outfit.occasion ?? "other");
    occasionCounts.set(occasion, [...(occasionCounts.get(occasion) ?? []), outfit.id]);
    const itemIds = [...new Set(outfit.itemIds)].sort();
    if (itemIds.length > 1) {
      const key = itemIds.join("|");
      const current = combinationCounts.get(key) ?? { itemIds, recordIds: [] };
      current.recordIds.push(outfit.id);
      combinationCounts.set(key, current);
    }
  }
  const occasionDistribution = [...occasionCounts].map(([occasion, recordIds]) => ({
    id: `worn:occasion:${occasion}`,
    value: { occasion, count: recordIds.length, share: recordIds.length / Math.max(1, worn.length) },
    confidence: evidenceConfidence(recordIds.length, worn.length),
    provenance: [{ source: "confirmed-worn-outfit" as const, recordIds, observationCount: recordIds.length }],
    advisoryOnly: true as const,
  }));
  const frequentlyWornCombinations = [...combinationCounts.values()]
    .filter((entry) => entry.recordIds.length >= 2)
    .sort((a, b) => b.recordIds.length - a.recordIds.length)
    .slice(0, 8)
    .map((entry) => ({
      id: `worn:combination:${entry.itemIds.join("|")}`,
      value: { itemIds: entry.itemIds, count: entry.recordIds.length },
      confidence: evidenceConfidence(entry.recordIds.length, worn.length),
      provenance: [{ source: "confirmed-worn-outfit" as const, recordIds: entry.recordIds, observationCount: entry.recordIds.length }],
      advisoryOnly: true as const,
    }));
  const behavioralValues: Array<{ value: string; recordId: string }> = [];
  for (const outfit of worn) {
    const occasion = normalizedOccasion(outfit.occasion ?? "other");
    for (const itemId of outfit.itemIds) {
      const item = byId.get(itemId);
      if (!item) continue;
      const itemTraits = classifyWardrobeTraits(item);
      if (itemTraits.pattern === "statement") {
        behavioralValues.push({ value: `pattern:statement@${occasion}`, recordId: outfit.id });
      }
      if (/\b(graphic tees?|graphic t-shirts?|logo tees?)\b/.test(itemTraits.text)) {
        behavioralValues.push({ value: `graphic-tee@${occasion}`, recordId: outfit.id });
      }
      if ((itemTraits.formality ?? 0) >= 3) {
        behavioralValues.push({ value: `polished-foundation@${occasion}`, recordId: outfit.id });
      }
    }
  }
  const highConfidenceBehavioralPatterns = topCounts(behavioralValues, "behavioral-pattern")
    .filter((entry) => entry.confidence === "high");

  const rejected = new Map<string, { itemId: string; occasion: string; reason: string; recordIds: string[] }>();
  for (const feedback of input.recommendationFeedback ?? []) {
    if (!["rejected", "dismissed", "corrected"].includes(feedback.status.toLowerCase())) continue;
    for (const itemId of feedback.itemIds) {
      const occasion = normalizedOccasion(feedback.occasion ?? "other");
      const reason = feedback.reason ?? "rejected";
      const key = `${itemId}:${occasion}:${reason}`;
      const current = rejected.get(key) ?? { itemId, occasion, reason, recordIds: [] };
      current.recordIds.push(feedback.id);
      rejected.set(key, current);
    }
  }
  for (const signal of input.behavioralSignals ?? []) {
    if (signal.strength !== "high" || !/\b(reject|avoid|correction)\b/.test(signal.subject.toLowerCase())) continue;
    const itemId = signal.context.itemId;
    if (!itemId || !byId.has(itemId)) continue;
    const occasion = normalizedOccasion(signal.context.occasion ?? "other");
    const key = `${itemId}:${occasion}:${signal.value}`;
    const current = rejected.get(key) ?? { itemId, occasion, reason: signal.value, recordIds: [] };
    current.recordIds.push(signal.sourceRecordId ?? signal.id);
    rejected.set(key, current);
  }
  const repeatedlyRejectedInContexts = [...rejected.values()]
    .filter((entry) => entry.recordIds.length >= 2)
    .map((entry) => ({
      id: `rejected:${entry.itemId}:${entry.occasion}:${entry.reason}`,
      value: { itemId: entry.itemId, occasion: entry.occasion, reason: entry.reason, count: entry.recordIds.length },
      confidence: evidenceConfidence(entry.recordIds.length, (input.recommendationFeedback ?? []).length),
      provenance: [{ source: "recommendation-rejection" as const, recordIds: entry.recordIds, observationCount: entry.recordIds.length }],
      advisoryOnly: true as const,
    }));

  const preferredDirectives: PersonalStyleDirective[] = profile.preferences
    .filter((preference) => preference.polarity === "prefer")
    .map((preference) => ({
      id: `evidence-match:${preference.id}`, kind: "rank", dimension: preference.dimension,
      value: preference.value, polarity: preference.polarity, authority: preference.authority,
      confidence: preference.confidence, garmentRoles: preference.garmentRoles,
      occasions: preference.occasions, provenance: preference.provenance,
      sourcePreferenceIds: [preference.id], vetoEligible: false,
    }));
  const wornIds = new Set(worn.flatMap((outfit) => outfit.itemIds));
  const underusedProfileAlignedItems = input.wardrobe.flatMap((item) => {
    if (wornIds.has(item.id) || (item.last_worn_at && item.last_worn_at !== "")) return [];
    const matched = preferredDirectives.filter((directive) => itemMatchesDirective(item, directive));
    if (!matched.length) return [];
    return [{
      id: `underused:${item.id}`,
      value: { itemId: item.id, matchedPreferenceIds: matched.flatMap((entry) => entry.sourcePreferenceIds) },
      confidence: matched.some((entry) => entry.authority.startsWith("explicit")) ? "medium" as const : "low" as const,
      provenance: [
        { source: "wardrobe-composition" as const, recordIds: [item.id], observationCount: 1 },
        { source: "behavioral-pattern" as const, recordIds: [], observationCount: 1 },
      ],
      advisoryOnly: true as const,
    }];
  }).slice(0, 12);
  return {
    ownerUserId: input.userId,
    dominantSilhouettes: silhouettes,
    recurringColorFamilies: colors,
    materialPatterns: materials,
    formalityDistribution,
    occasionDistribution,
    frequentlyWornCombinations,
    highConfidenceBehavioralPatterns,
    underusedProfileAlignedItems,
    repeatedlyRejectedInContexts,
  };
}

function reconcileStyleEvidence(
  preferences: StylePreference[],
  evidence: WardrobeEvidenceSummary,
): StyleEvidenceReconciliation {
  const conflicts: StyleEvidenceConflict[] = [];
  const explicitPatternAvoid = preferences.filter((item) =>
    item.dimension === "pattern" && item.polarity === "avoid" && item.authority.startsWith("explicit")
  );
  const wornPatternEvidence = evidence.highConfidenceBehavioralPatterns.filter((entry) =>
    entry.value.startsWith("pattern:statement@")
  );
  if (explicitPatternAvoid.length && wornPatternEvidence.length) {
    conflicts.push({
      dimension: "pattern",
      explicitPreferenceIds: explicitPatternAvoid.map((item) => item.id),
      evidenceInferenceIds: wornPatternEvidence.map((item) => item.id),
      resolution: "ask-focused-question",
      question: "You have said you avoid prints, but some frequently worn looks include them. Are there particular prints or occasions where they still feel like you?",
    });
  }
  const focusedQuestion = conflicts.find((item) => item.question)?.question ?? null;
  return { conflicts, focusedQuestion };
}

/** Stateless, request-specific interpretation. Event Policy remains authoritative. */
export function interpretPersonalStyle(
  profile: ResolvedStyleProfile,
  context: ContextEvidence,
  wardrobeEvidence: WardrobeEvidenceSummary = emptyWardrobeEvidence(profile.ownerUserId),
): PersonalStylingBrief {
  const occasion = normalizedOccasion(context.agendaItem.title);
  const current = [context.intention.value, context.userNotes.value, context.statedDressCode.value]
    .filter((item): item is string => Boolean(item));
  const currentText = current.join(" ").toLowerCase();
  const applicable = profile.preferences.filter((item) =>
    !item.occasions.length ||
    item.occasions.map(normalizedOccasion).includes(occasion) ||
    (item.dimension === "garment-role" && item.value === "reserved")
  );
  const explicitDirectives: PersonalStyleDirective[] = applicable.map((item) => {
    const lowInference = item.authority === "inferred-low";
    const explicit = item.authority === "explicit-confirmed" || item.authority === "explicit-current";
    const kind: PersonalStyleDirective["kind"] =
      item.dimension === "polish" ? "polish"
        : item.dimension === "combination" ? "combination"
          : item.dimension === "garment-role" && item.value === "reserved" ? "reserve"
            : item.polarity === "required" ? "require"
              : item.polarity === "avoid" ? "avoid"
                : lowInference ? "observe" : "rank";
    const currentNamesRole = item.garmentRoles.some((role) => {
      if (role === "casual-basics") return /\b(graphic tee|t-shirt|tee|tank|casual basic)\b/.test(currentText);
      if (role === "activewear") return /\b(activewear|workout|athletic|leggings)\b/.test(currentText);
      return currentText.includes(role.replace("-", " "));
    });
    const currentNamesValue = currentText.includes(item.value.replaceAll("_", " ").toLowerCase());
    const explicitCurrentOverride = (currentNamesRole || currentNamesValue) &&
      !new RegExp(`\\b(no|not|avoid|without)\\b.{0,24}${item.value.replaceAll("_", " ")}`, "i").test(currentText);
    return {
      id: `directive:${item.id}`,
      kind,
      dimension: item.dimension,
      value: item.value,
      polarity: item.polarity,
      authority: item.authority,
      confidence: item.confidence,
      garmentRoles: [...item.garmentRoles],
      occasions: [...item.occasions],
      provenance: item.provenance,
      sourcePreferenceIds: [item.id],
      vetoEligible:
        explicit &&
        ["avoid", "required"].includes(item.polarity) &&
        (kind !== "reserve" || item.occasions.length > 0) &&
        !explicitCurrentOverride,
    };
  });
  // Ownership frequency is evidence of availability, not preference. Only
  // demonstrated behavior or an explicit profile may create a style directive.
  const evidenceDirectives: PersonalStyleDirective[] = [
    ...wardrobeEvidence.underusedProfileAlignedItems.map((entry): PersonalStyleDirective => ({
      id: `directive:${entry.id}`, kind: "rank", dimension: "wardrobe-priority",
      value: entry.value.itemId, polarity: "prefer", authority: "inferred-medium",
      confidence: entry.confidence, garmentRoles: [], occasions: [],
      provenance: "wardrobe-evidence", sourcePreferenceIds: [entry.id], vetoEligible: false,
    })),
    ...wardrobeEvidence.repeatedlyRejectedInContexts
      .filter((entry) => entry.value.occasion === occasion)
      .map((entry): PersonalStyleDirective => ({
        id: `directive:${entry.id}`, kind: "avoid", dimension: "wardrobe-priority",
        value: entry.value.itemId, polarity: "avoid", authority: "inferred-high",
        confidence: entry.confidence, garmentRoles: [], occasions: [entry.value.occasion],
        provenance: "behavioral-signal", sourcePreferenceIds: [entry.id],
        // Even high-confidence behavior remains advisory until explicitly confirmed.
        vetoEligible: false,
      })),
    ...wardrobeEvidence.highConfidenceBehavioralPatterns
      .filter((entry) => entry.value.startsWith("graphic-tee@"))
      .map((entry): PersonalStyleDirective => {
        const observedOccasion = entry.value.split("@")[1] ?? "other";
        return {
          id: `directive:${entry.id}`, kind: "reserve", dimension: "garment-role",
          value: "graphic-tee", polarity: "varies", authority: "inferred-high",
          confidence: entry.confidence, garmentRoles: ["casual-basics"], occasions: [observedOccasion],
          provenance: "behavioral-signal", sourcePreferenceIds: [entry.id], vetoEligible: false,
        };
      }),
  ];
  const directives = [...explicitDirectives, ...evidenceDirectives];
  return {
    schemaVersion: PERSONAL_STYLING_BRIEF_VERSION,
    profileVersion: profile.version,
    ownerUserId: profile.ownerUserId,
    requestKey: `${context.agendaItem.id}:${context.agendaItem.startTime ?? "all-day"}`,
    occasion,
    desiredPolish: requestedPolish(context, applicable),
    neutral:
      directives.length === 0 ||
      (
        profile.status !== "active" &&
        wardrobeEvidence.highConfidenceBehavioralPatterns.length === 0 &&
        wardrobeEvidence.repeatedlyRejectedInContexts.length === 0
      ),
    explicitCurrentInstructions: current,
    directives,
    wardrobeEvidence,
    reconciliation: reconcileStyleEvidence(applicable, wardrobeEvidence),
  };
}

function itemMatchesDirective(item: EngineWardrobeItem, directive: PersonalStyleDirective) {
  const traits = classifyWardrobeTraits(item);
  const value = directive.value.toLowerCase().replaceAll("_", " ");
  if (directive.dimension === "wardrobe-priority" && directive.value === item.id) return true;
  if (directive.garmentRoles.length) {
    const roleMatch = directive.garmentRoles.some((role) =>
      role === traits.role ||
      (role === "casual-basics" && /\b(tees?|t-shirts?|tanks?|casual basics?)\b/.test(traits.text)) ||
      (role === "activewear" && /\b(activewear|athletic|gym|workout|leggings?|sports? tops?)\b/.test(traits.text)) ||
      (role === "tailoring" && /\b(tailored|blazers?|suits?|trousers?)\b/.test(traits.text)) ||
      (role === "outerwear" && traits.role === "layer")
    );
    if (!roleMatch) return false;
  }
  if (directive.dimension === "color") return (item.color ?? "").toLowerCase().includes(value);
  if (directive.dimension === "pattern") {
    if (value.includes("solid")) return traits.pattern === "solid";
    if (value.includes("pattern")) return traits.pattern === "statement";
  }
  if (directive.dimension === "comfort") {
    if (value === "walkable footwear") {
      return traits.role === "shoes" && (traits.walkability ?? 0) >= 4;
    }
    if (value === "breathable fabrics") {
      return ["top", "bottom", "one-piece"].includes(traits.role) && (traits.warmth ?? 5) <= 2;
    }
    if (value === "light layers") {
      return traits.role === "layer" && (traits.warmth ?? 5) <= 2;
    }
    if (value === "easy movement") {
      return ["top", "bottom", "one-piece"].includes(traits.role) &&
        !/\b(bodycon|corset|rigid|restrictive)\b/.test(traits.text);
    }
  }
  if (directive.dimension === "footwear" && ["no heels", "flat only"].includes(value)) {
    return traits.role === "shoes" &&
      (traits.formalFootwear || traits.pump || traits.stiletto || /\bheels?\b/.test(traits.text));
  }
  if (directive.dimension === "material") return traits.materials.includes(value);
  if (directive.dimension === "footwear" && traits.role !== "shoes") return false;
  return traits.text.includes(value);
}

/** Role-level interpretation occurs before candidate generation. */
export function itemStyleEligibility(item: EngineWardrobeItem, brief: PersonalStylingBrief) {
  const rejectionReasons: string[] = [];
  const matchedDirectiveIds: string[] = [];
  for (const directive of brief.directives) {
    if (!itemMatchesDirective(item, directive)) continue;
    matchedDirectiveIds.push(directive.id);
    if (directive.vetoEligible && directive.kind === "avoid") {
      rejectionReasons.push(`style-avoid:${directive.id}`);
    }
    if (directive.vetoEligible && directive.kind === "reserve" && !directive.occasions.includes(brief.occasion)) {
      rejectionReasons.push(`occasion-reservation:${directive.id}`);
    }
  }
  return { eligible: rejectionReasons.length === 0, rejectionReasons, matchedDirectiveIds };
}

const polishTarget = { casual: 2, "polished-casual": 3, polished: 4, formal: 5, neutral: 3 };

/** Evaluates relationships in a complete look; it never adds or retypes garments. */
export function assessPersonalStyle(
  items: EngineWardrobeItem[],
  brief: PersonalStylingBrief,
): PersonalStyleAssessment {
  if (brief.neutral) {
    return {
      briefVersion: brief.schemaVersion, score: 0, personalPolishScore: null,
      cohesionScore: null, matchedDirectiveIds: [], conflictingDirectiveIds: [], rejectionReasons: [],
    };
  }
  const traits = items.map(classifyWardrobeTraits);
  const foundation = traits.filter((item) => ["top", "bottom", "one-piece"].includes(item.role));
  const shoe = traits.find((item) => item.role === "shoes");
  const knownFormalities = foundation.map((item) => item.formality).filter((item): item is number => item != null);
  const averageFormality = knownFormalities.length
    ? knownFormalities.reduce((sum, item) => sum + item, 0) / knownFormalities.length
    : null;
  const target = polishTarget[brief.desiredPolish];
  const personalPolishScore = averageFormality == null
    ? null
    : Math.max(0, 100 - Math.abs(averageFormality - target) * 24 - Math.max(0, target - (shoe?.polish ?? target)) * 12);
  const competingPatterns = foundation.filter((item) => item.pattern === "statement").length > 1;
  const formalitySpread = knownFormalities.length > 1 ? Math.max(...knownFormalities) - Math.min(...knownFormalities) : 0;
  const cohesionScore = Math.max(0, 100 - (competingPatterns ? 45 : 0) - formalitySpread * 24);
  const matchedDirectiveIds: string[] = [];
  const conflictingDirectiveIds: string[] = [];
  let score = 0;
  for (const directive of brief.directives) {
    if (directive.kind === "combination") {
      const elevatedFoundation = (averageFormality ?? 3) >= 3;
      const polishedDetail = (shoe?.polish ?? 3) >= 4;
      const relationshipMatches =
        directive.value === "more_likely_a" ? !elevatedFoundation && polishedDetail
          : directive.value === "more_likely_b" ? elevatedFoundation && !polishedDetail
            : directive.value === "equally_likely" || directive.value === "depends_on_occasion";
      if (relationshipMatches) {
        matchedDirectiveIds.push(directive.id);
        score += 8;
      } else {
        conflictingDirectiveIds.push(directive.id);
        score -= 5;
      }
      continue;
    }
    if (directive.dimension === "aesthetic") {
      const aestheticMatch =
        ["polished", "elegant", "considered", "assured"].includes(directive.value) ? (personalPolishScore ?? 50) >= 65
          : ["creative", "distinctive", "playful", "unconventional"].includes(directive.value)
            ? foundation.some((item) => item.pattern === "statement")
            : true;
      if (aestheticMatch) {
        matchedDirectiveIds.push(directive.id);
        score += directive.authority === "inferred-low" ? 1 : 4;
      } else {
        conflictingDirectiveIds.push(directive.id);
        score -= directive.authority === "inferred-low" ? 0 : 3;
      }
      continue;
    }
    const matches = items.some((item) => itemMatchesDirective(item, directive));
    if (matches) {
      matchedDirectiveIds.push(directive.id);
      score += directive.kind === "rank" ? 5 : 2;
    } else if (directive.kind === "require") {
      conflictingDirectiveIds.push(directive.id);
      if (directive.vetoEligible) score -= 20;
    }
  }
  if (personalPolishScore != null) score += Math.round((personalPolishScore - 50) / 10);
  if (cohesionScore != null) score += Math.round((cohesionScore - 50) / 10);
  const rejectionReasons = brief.directives
    .filter((directive) => directive.kind === "require" && directive.vetoEligible)
    .filter((directive) => !items.some((item) => itemMatchesDirective(item, directive)))
    .map((directive) => `style-required:${directive.id}`);
  return {
    briefVersion: brief.schemaVersion,
    score,
    personalPolishScore,
    cohesionScore,
    matchedDirectiveIds,
    conflictingDirectiveIds,
    rejectionReasons,
  };
}
