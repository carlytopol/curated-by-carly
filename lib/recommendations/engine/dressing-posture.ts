import type { ContextEvidence, EngineWardrobeItem } from "./types";
import { classifyWardrobeTraits } from "./item-taxonomy";

export type DressingPosture = {
  version: "dressing-posture-v1-preview";
  archetype:
    | "everyday-casual-social"
    | "professional"
    | "special-social"
    | "formal"
    | "active"
    | "neutral";
  formalityFloor: number;
  formalityTarget: number;
  formalityCeiling: number;
  requestedPolish: "casual" | "polished-casual" | "polished" | "formal" | "neutral";
  missingContextLowersConfidenceOnly: true;
};

type PostureContext = Pick<
  ContextEvidence,
  "agendaItem" | "statedDressCode" | "userNotes" | "intention"
>;

function contextText(context: PostureContext) {
  return [
    context.agendaItem.title,
    context.statedDressCode.value,
    context.userNotes.value,
    context.intention.value,
  ].filter(Boolean).join(" ").toLowerCase();
}

// The minimum foundation formality an elevated polish request implies. Kept in
// step with polishTarget in style-profile.ts, which scores the same distance.
// Casual and neutral imply nothing and never raise the target.
const impliedFormality: Record<DressingPosture["requestedPolish"], number> = {
  casual: 0,
  neutral: 0,
  "polished-casual": 3,
  polished: 4,
  formal: 5,
};

/**
 * The polish a customer asks for and the formality the engine aims at must
 * describe the same day. Raise the target to what the requested polish implies,
 * never past the ceiling that governs eligibility.
 */
function reconcileTargetWithPolish(posture: DressingPosture): DressingPosture {
  const implied = impliedFormality[posture.requestedPolish];
  if (implied <= posture.formalityTarget) return posture;
  return { ...posture, formalityTarget: Math.min(posture.formalityCeiling, implied) };
}

/**
 * Establishes how dressed the day should feel before a garment is considered.
 * "Polished" refines an everyday posture; it does not promote lunch, shopping,
 * errands, or another casual social day into occasion/formal dressing.
 */
export function buildDressingPosture(context: PostureContext): DressingPosture {
  return reconcileTargetWithPolish(resolvePostureShape(context));
}

function resolvePostureShape(context: PostureContext): DressingPosture {
  const text = contextText(context);
  const elevatedNonFormal = /\b(?:dressy|dressed(?:\s+up)?|dress)\b[\s\S]{0,40}\b(?:but\s+)?not\s+formal\b|\bnot\s+formal\b[\s\S]{0,40}\b(?:dressy|dressed(?:\s+up)?)\b/.test(text);
  const rejectsFormal = /\bnon[- ]?formal\b|\bformal\s+(?:dresses?|wear|garments?|pieces?)\b[\s\S]{0,120}\b(?:inappropriate|unsuitable|not appropriate|should\s+not|shouldn['’]?t|avoid|unless)\b/.test(text);
  const explicitlyFormal = /\b(black.?tie|white.?tie|gala|formal wedding|formal dinner|formal dress code)\b/.test(text) && !rejectsFormal;
  const specialSocial = /\b(wedding|cocktail|fine dining|anniversary|ceremony|reception)\b/.test(text);
  const professional = /\b(board|client|business|office|presentation|conference)\b/.test(text) &&
    /\b(meeting|dinner|event|day|presentation|conference)\b/.test(text);
  const active = /\b(workout|gym|fitness|tennis|exercise|pool|beach)\b/.test(text);
  const everyday = /\b(shopping|lunch|brunch|errands?|appointment|out and about|cafe|coffee|casual|concert|stadium|festival|volunteer(?:ing)?|school|classroom|campus|open house|community service|touring (?:prospective|potential) parents?)\b/.test(text);

  if (explicitlyFormal) {
    return {
      version: "dressing-posture-v1-preview", archetype: "formal",
      formalityFloor: 4, formalityTarget: 5, formalityCeiling: 5,
      requestedPolish: "formal", missingContextLowersConfidenceOnly: true,
    };
  }
  if (elevatedNonFormal) {
    return {
      version: "dressing-posture-v1-preview", archetype: "special-social",
      formalityFloor: 3, formalityTarget: 4, formalityCeiling: 4,
      requestedPolish: "polished", missingContextLowersConfidenceOnly: true,
    };
  }
  if (specialSocial) {
    return {
      version: "dressing-posture-v1-preview", archetype: "special-social",
      formalityFloor: 2, formalityTarget: 4, formalityCeiling: 5,
      requestedPolish: "polished", missingContextLowersConfidenceOnly: true,
    };
  }
  if (professional) {
    return {
      version: "dressing-posture-v1-preview", archetype: "professional",
      formalityFloor: 2, formalityTarget: 3, formalityCeiling: 4,
      requestedPolish: "polished", missingContextLowersConfidenceOnly: true,
    };
  }
  if (active) {
    return {
      version: "dressing-posture-v1-preview", archetype: "active",
      formalityFloor: 1, formalityTarget: 1, formalityCeiling: 2,
      requestedPolish: "casual", missingContextLowersConfidenceOnly: true,
    };
  }
  if (rejectsFormal) {
    return {
      version: "dressing-posture-v1-preview", archetype: "everyday-casual-social",
      formalityFloor: 1, formalityTarget: 2, formalityCeiling: 3,
      requestedPolish: "polished-casual", missingContextLowersConfidenceOnly: true,
    };
  }
  if (everyday) {
    return {
      version: "dressing-posture-v1-preview", archetype: "everyday-casual-social",
      formalityFloor: 1, formalityTarget: 2, formalityCeiling: 3,
      requestedPolish: /\b(polished|trendy|elevated|chic|put together|prospective parents?|potential parents?)\b/.test(text)
        ? "polished-casual" : "casual",
      missingContextLowersConfidenceOnly: true,
    };
  }
  return {
    version: "dressing-posture-v1-preview", archetype: "neutral",
    formalityFloor: 1, formalityTarget: 3, formalityCeiling: 4,
    requestedPolish: /\bpolished|elevated|chic\b/.test(text) ? "polished" : "neutral",
    missingContextLowersConfidenceOnly: true,
  };
}

export function postureItemPriority(item: EngineWardrobeItem, posture: DressingPosture) {
  const traits = classifyWardrobeTraits(item);
  const formalityDistance = traits.formality == null
    ? 1.25
    : Math.abs(traits.formality - posture.formalityTarget);
  const polishFit = traits.role === "shoes" && posture.requestedPolish !== "casual"
    ? Math.max(0, 4 - (traits.polish ?? 2))
    : 0;
  return formalityDistance * 20 + polishFit * 10 - (item.rotationScore ?? 50) / 10;
}
