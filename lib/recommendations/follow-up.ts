export function followUpRequiresNewOutfits(question: string, pairPreferenceSaved = false) {
  if (pairPreferenceSaved) return true;
  return /\b(doesn['’]?t match|do not match|don['’]?t match|wrong (?:choice|choices|outfit|outfits)|too hot|too cold|too warm|too formal|too dressy|too fancy|overdressed|too casual|too relaxed|formal wear|provided heels?|gave me heels?|comfortable shoes?|unavailable|not comfortable|not the mood|replace|swap|change (?:the|this)|try again|start (?:again|over)|new (?:outfit|outfits|option|options|choice|choices|look|looks)|another (?:outfit|option|choice|look)|additional (?:outfits?|options?|choices?|looks?)|better (?:match|outfits?|options?|choices?|looks?)|(?:show|see|display)(?:\s+\w+){0,8}\s+(?:options?|outfits?|looks?|choices?)|no heels?|no jeans?|no long sleeves?|no slides?|no boots?|more polished|need (?:secure )?pockets?|pockets? required)\b/i.test(question);
}

export function followUpOnlyRequestsVisibleOptions(question: string) {
  const normalized = question.trim().replace(/\s+/g, " ");
  return /\b(?:show|see|display)(?:\s+\w+){0,8}\s+(?:the\s+)?(?:new\s+)?(?:options?|outfits?|looks?|choices?)(?:\s+in\s+(?:this|the)\s+chat)?\b/i.test(normalized) &&
    !/\b(doesn['’]?t match|wrong|too |no |replace|swap|change|better|formal|casual|hot|cold|comfortable|polished|pockets?)\b/i.test(normalized);
}

export function eventCorrectionFromQuestion(question: string) {
  const normalized = question.trim().replace(/\s+/g, " ");
  if (!normalized || !followUpRequiresNewOutfits(normalized) || followUpOnlyRequestsVisibleOptions(normalized)) return null;
  return normalized.slice(0, 500);
}

export function appendEventCorrection(notes: string | null | undefined, correction: string) {
  const existing = (notes ?? "").trim();
  const marker = `[User styling correction] ${correction}`;
  if (existing.toLowerCase().includes(marker.toLowerCase())) return existing;
  const lines = existing ? existing.split("\n") : [];
  const corrections = lines.filter((line) => line.startsWith("[User styling correction]"));
  const ordinary = lines.filter((line) => !line.startsWith("[User styling correction]"));
  return [...ordinary, ...corrections.slice(-7), marker].filter(Boolean).join("\n").slice(-4000);
}

export type DurablePolishCorrection = {
  questionId: "q3_occasion_polish";
  subject: string;
  value: "relaxed" | "easy_considered" | "polished";
  scope: { occasion: string };
};

function correctionOccasion(eventTitle: string) {
  const text = eventTitle.toLowerCase();
  if (/\b(workout|gym|fitness|tennis|exercise)\b/.test(text)) return "workout";
  if (/\b(errands?|shopping|appointments?|coffee|lunch|brunch)\b/.test(text)) return "social";
  if (/\b(volunteer(?:ing)?|school|classroom|campus|open house|community service)\b/.test(text)) return "community";
  if (/\b(work|meeting|professional|office|client)\b/.test(text)) return "work";
  if (/\b(dinner|restaurant|date)\b/.test(text)) return "dinner";
  if (/\b(travel|flight|airport)\b/.test(text)) return "travel";
  if (/\b(wedding|formal|ceremony|gala)\b/.test(text)) return "formal";
  if (/\b(social|concert|party)\b/.test(text)) return "social";
  return "other";
}

/**
 * Only clear, durable polish corrections become future Style Profile evidence.
 * Temporary constraints (weather, one-day shoes, pockets) stay with the event.
 */
export function durablePolishCorrection(
  question: string,
  eventTitle: string,
): DurablePolishCorrection | null {
  const text = question.toLowerCase();
  const value = /\b(too formal|less formal|more casual|too dressed|too dressy|too fancy|overdressed|wrong (?:choice|choices|outfit|outfits)[\s\S]{0,80}formal|provided formal wear|gave me formal wear|submitted formal wear|formal (?:dresses?|wear|garments?|pieces?)[\s\S]{0,120}(?:inappropriate|unsuitable|not appropriate|should not|shouldn['’]?t|do not|don['’]?t|avoid|unless))\b/.test(text)
    ? "easy_considered" as const
    : /\b(more polished|more elevated|more refined|too casual|not polished enough)\b/.test(text)
      ? "polished" as const
      : /\b(more relaxed|easier|very casual)\b/.test(text)
        ? "relaxed" as const
        : null;
  if (!value) return null;
  const occasion = correctionOccasion(eventTitle);
  return {
    questionId: "q3_occasion_polish",
    subject: `confirmed-correction:polish:${occasion}`,
    value,
    scope: { occasion },
  };
}
