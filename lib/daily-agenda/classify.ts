import type { CalendarEvent } from "@/types/calendar";
import type {
  AgendaItemKind,
  DressCodeInference,
  OccasionClassification,
} from "@/types/daily-agenda";

type EventEvidence = Pick<CalendarEvent, "title" | "location" | "isAllDay">;

type OccasionRule = {
  kind: AgendaItemKind;
  occasion: string;
  confidence: "medium" | "high";
  reasonCode: string;
  pattern: RegExp;
};

const occasionRules: OccasionRule[] = [
  { kind: "flight", occasion: "Air travel", confidence: "high", reasonCode: "flight_keyword", pattern: /\b(flight|airport|departures?|arrivals?|boarding|terminal|gate)\b|\b[A-Z]{2}\s?\d{2,4}\b/i },
  { kind: "wedding", occasion: "Wedding", confidence: "high", reasonCode: "wedding_keyword", pattern: /\b(wedding|nuptials|ceremony and reception|wedding reception)\b/i },
  { kind: "workout", occasion: "Workout", confidence: "high", reasonCode: "workout_keyword", pattern: /\b(workout|gym|yoga|pilates|spin|barre|tennis|training|run|running|fitness|strength|cycling)\b/i },
  { kind: "dinner", occasion: "Dinner", confidence: "high", reasonCode: "dinner_keyword", pattern: /\b(dinner|supper)\b/i },
  { kind: "meeting", occasion: "Professional meeting", confidence: "high", reasonCode: "professional_meeting_keyword", pattern: /\b(board|client|interview|presentation|pitch|all hands|town hall|one[- ]to[- ]one|1:1)\b/i },
  { kind: "meeting", occasion: "Meeting", confidence: "medium", reasonCode: "meeting_keyword", pattern: /\b(meeting|sync|standup|check[- ]in|conference|call|zoom|teams)\b/i },
  { kind: "vacation", occasion: "Vacation", confidence: "high", reasonCode: "vacation_keyword", pattern: /\b(vacation|holiday|pto|out of office|resort stay)\b/i },
  { kind: "travel", occasion: "Travel", confidence: "medium", reasonCode: "travel_keyword", pattern: /\b(travel|train|rail|road trip|transfer|check[- ]in|ferry|cruise)\b/i },
  { kind: "social", occasion: "Social event", confidence: "medium", reasonCode: "social_keyword", pattern: /\b(party|birthday|drinks|cocktails|concert|theatre|theater|brunch|lunch|gala|fundraiser)\b/i },
  { kind: "appointment", occasion: "School or community commitment", confidence: "high", reasonCode: "school_community_keyword", pattern: /\b(volunteer(?:ing)?|school (?:day|tour|event|open house)|classroom|campus tour|touring (?:prospective|potential) parents?|parent volunteer|community service)\b/i },
  { kind: "appointment", occasion: "Appointment", confidence: "medium", reasonCode: "appointment_keyword", pattern: /\b(appointment|fitting|consultation)\b/i },
];

const explicitDressCodes: Array<{ pattern: RegExp; dressCode: string; reasonCode: string }> = [
  { pattern: /\bwhite tie\b/i, dressCode: "white tie", reasonCode: "explicit_white_tie" },
  { pattern: /\bblack tie optional\b/i, dressCode: "black tie optional", reasonCode: "explicit_black_tie_optional" },
  { pattern: /\bblack tie\b/i, dressCode: "black tie", reasonCode: "explicit_black_tie" },
  { pattern: /\bcocktail attire\b/i, dressCode: "cocktail attire", reasonCode: "explicit_cocktail_attire" },
  { pattern: /\bbusiness casual\b/i, dressCode: "business casual", reasonCode: "explicit_business_casual" },
  { pattern: /\bsmart casual\b/i, dressCode: "smart casual", reasonCode: "explicit_smart_casual" },
  { pattern: /\bsemi[- ]formal\b/i, dressCode: "semi-formal", reasonCode: "explicit_semi_formal" },
  { pattern: /\bformal attire\b/i, dressCode: "formal", reasonCode: "explicit_formal" },
  { pattern: /\bcasual attire\b/i, dressCode: "casual", reasonCode: "explicit_casual" },
];

function evidenceText(event: EventEvidence) {
  return `${event.title} ${event.location ?? ""}`.replace(/\s+/g, " ").trim();
}

function isWorkoutEvidence(evidence: string) {
  const withoutOrdinaryRunningPhrases = evidence
    .replace(/\brunn?ing\s+(?:errands?|late|a\s+business|a\s+company|the\s+household)\b/gi, " ")
    .replace(/\bwork(?:ing)?\s+(?:from\s+home|at\s+home|around\s+the\s+house)\b/gi, " ");
  return occasionRules[2].pattern.test(withoutOrdinaryRunningPhrases);
}

export function classifyOccasion(event: EventEvidence): OccasionClassification {
  const evidence = evidenceText(event);
  const match = occasionRules.find((rule) =>
    rule.kind === "workout" ? isWorkoutEvidence(evidence) : rule.pattern.test(evidence),
  );
  if (match) {
    return {
      kind: match.kind,
      occasion: match.occasion,
      confidence: match.confidence,
      source: "rules",
      reasonCode: match.reasonCode,
      correctedByUser: false,
    };
  }
  return {
    kind: "other",
    occasion: event.isAllDay ? "All-day commitment" : null,
    confidence: "low",
    source: event.isAllDay ? "rules" : "none",
    reasonCode: event.isAllDay ? "all_day_context" : "no_matching_rule",
    correctedByUser: false,
  };
}

export function inferDressCode(
  event: EventEvidence,
  classification: OccasionClassification,
): DressCodeInference {
  const evidence = evidenceText(event);
  const explicit = explicitDressCodes.find((rule) => rule.pattern.test(evidence));
  if (explicit) {
    return {
      dressCode: explicit.dressCode,
      confidence: "high",
      source: "rules",
      reasonCode: explicit.reasonCode,
      correctedByUser: false,
    };
  }

  switch (classification.kind) {
    case "workout":
      return { dressCode: "activewear", confidence: "high", source: "rules", reasonCode: "workout_requires_activewear", correctedByUser: false };
    case "flight":
      return { dressCode: "comfortable travel layers", confidence: "high", source: "rules", reasonCode: "flight_travel_practicality", correctedByUser: false };
    case "travel":
      return { dressCode: "polished travel layers", confidence: "medium", source: "rules", reasonCode: "travel_practicality", correctedByUser: false };
    case "meeting":
      return { dressCode: "professional", confidence: "medium", source: "rules", reasonCode: "meeting_formality", correctedByUser: false };
    case "dinner":
      return { dressCode: "elevated casual", confidence: "low", source: "rules", reasonCode: "dinner_formality_uncertain", correctedByUser: false };
    case "appointment":
      if (classification.reasonCode === "school_community_keyword") {
        return { dressCode: "approachable polished casual", confidence: "high", source: "rules", reasonCode: "school_community_practicality", correctedByUser: false };
      }
      return { dressCode: null, confidence: "low", source: "none", reasonCode: "appointment_formality_uncertain", correctedByUser: false };
    case "vacation":
      return { dressCode: "relaxed daywear", confidence: "low", source: "rules", reasonCode: "vacation_context", correctedByUser: false };
    default:
      return { dressCode: null, confidence: "low", source: "none", reasonCode: "insufficient_dress_code_evidence", correctedByUser: false };
  }
}
