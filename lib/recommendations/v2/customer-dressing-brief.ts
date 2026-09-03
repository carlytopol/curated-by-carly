import {
  CUSTOMER_DRESSING_BRIEF_VERSION,
  validateCustomerDressingBrief,
  type ComfortRequirement,
  type CustomerDressingBrief,
  type ExplicitItemInstruction,
  type ScopedCorrectionReference,
  type SuppressionReference,
} from "./contracts";
import {
  RECOMMENDATION_V2_TAXONOMY_VERSION,
  type CarryingPredicate,
  type CoveragePredicate,
  type EvidenceRef,
  type FootwearPredicate,
  type GovernedPreference,
  type GovernedProhibition,
  type GovernedRequirement,
  type InstructionId,
  type MovementPredicate,
  type OccasionId,
  type PracticalPurposeId,
  type QualityId,
  type ToneId,
} from "./taxonomy";

export const CUSTOMER_DRESSING_BRIEF_BUILDER_VERSION =
  "customer-dressing-brief-builder.v2.3.0" as const;

type EvidenceBacked<T> = T & { evidenceRefs: EvidenceRef[] };
type WithoutEvidence<T> = T extends unknown ? Omit<T, "evidenceRefs"> : never;

export type ConfirmedCustomerMeaning = {
  occasion?: OccasionId;
  desiredTone?: ToneId[];
  practicalPurpose?: PracticalPurposeId[];
  desiredImpression?: Array<{ quality: QualityId; strength: "light" | "moderate" | "strong" }>;
  requiredQualities?: QualityId[];
  avoidedQualities?: QualityId[];
  comfortRequirements?: Array<Omit<ComfortRequirement, "evidenceRefs">>;
  coverageRequirements?: Array<WithoutEvidence<CoveragePredicate>>;
  footwearRequirements?: Array<WithoutEvidence<FootwearPredicate>>;
  carryingNeeds?: Array<WithoutEvidence<CarryingPredicate>>;
  movementRequirements?: Array<WithoutEvidence<MovementPredicate>>;
  explicitItemInstructions?: Array<Omit<ExplicitItemInstruction, "displayLanguage" | "evidenceRefs">>;
};

export type CustomerBriefStatement = {
  text: string;
  evidenceRef: EvidenceRef;
  confirmedMeaning?: ConfirmedCustomerMeaning;
};

export type ProfileBriefDefaults = {
  evidenceRef: EvidenceRef;
  desiredTone?: ToneId[];
  desiredImpression?: Array<{ quality: QualityId; strength: "light" | "moderate" | "strong" }>;
  preferredQualities?: QualityId[];
  comfortPreferences?: Array<Omit<ComfortRequirement, "evidenceRefs">>;
};

export type BuildCustomerDressingBriefInput = {
  artifactId: string;
  artifactRevision: string;
  requestId: string;
  ownerUserId: string;
  generatedAt: string;
  statements?: CustomerBriefStatement[];
  profileDefaults?: ProfileBriefDefaults[];
  activeCorrections?: ScopedCorrectionReference[];
  activeSuppressions?: SuppressionReference[];
};

export type CustomerDressingBriefConfirmation = {
  headline: string;
  understood: string[];
  unresolved: string[];
  question: string | null;
};

const CUSTOMER_DIRECTIVE_AUTHORITIES = new Set([
  "customer-current",
  "customer-durable",
  "authorized-customer-service",
]);

const unique = <T>(values: T[]) => [...new Set(values)];
const withEvidence = <T>(value: T, evidenceRef: EvidenceRef): EvidenceBacked<T> => ({
  ...value,
  evidenceRefs: [evidenceRef],
});
const stableKey = (value: unknown) => JSON.stringify(value, (key, child) =>
  key === "evidenceRefs" ? undefined : child);

function dedupe<T extends { evidenceRefs: EvidenceRef[] }>(values: T[]) {
  const byKey = new Map<string, T>();
  for (const value of values) {
    const key = stableKey(value);
    const existing = byKey.get(key);
    byKey.set(key, existing
      ? { ...existing, evidenceRefs: unique([...existing.evidenceRefs, ...value.evidenceRefs]) }
      : value);
  }
  return [...byKey.values()];
}

function inferConfirmedMeaning(text: string): ConfirmedCustomerMeaning {
  const value = text.toLocaleLowerCase("en-US");
  const meaning: ConfirmedCustomerMeaning = {};
  const tones: ToneId[] = [];
  const purposes: PracticalPurposeId[] = [];
  const required: QualityId[] = [];
  const avoided: QualityId[] = [];
  const comfort: Array<Omit<ComfortRequirement, "evidenceRefs">> = [];
  const footwear: Array<WithoutEvidence<FootwearPredicate>> = [];
  const carrying: Array<WithoutEvidence<CarryingPredicate>> = [];
  const movement: Array<WithoutEvidence<MovementPredicate>> = [];
  const coverage: Array<WithoutEvidence<CoveragePredicate>> = [];

  const occasions: Array<[RegExp, OccasionId]> = [
    [/\bvolunteer(?:ing)?\b|\bschool\b|\bcampus\b/, "school-community"],
    [/\bbusiness meeting\b|\bclient meeting\b/, "business-meeting"],
    [/\bworkout\b|\bgym\b|\btennis\b/, "workout"],
    [/\btravel\b|\bflight\b|\bairport\b/, "travel"],
    [/\bshopping\b/, "shopping"],
    [/\berrands?\b/, "errands"],
    [/\blunch\b|\bbrunch\b/, "lunch"],
    [/\bdinner\b/, "dinner"],
    [/\bdate night\b|\bdate\b/, "date"],
    [/\bwedding\b|\bceremony\b/, "ceremony"],
    [/\bconcert\b|\boutdoor social\b/, "outdoor-social"],
    [/\bwork\b|\boffice\b/, "work"],
  ];
  meaning.occasion = occasions.find(([pattern]) => pattern.test(value))?.[1];

  if (/\bpolished\b|\bput[- ]together\b|\belevated\b/.test(value)) tones.push("polished");
  if (/\bcasual\b|\brelaxed\b/.test(value)) tones.push("relaxed");
  if (/\bprofessional\b/.test(value)) tones.push("professional");
  if (/\bpractical\b/.test(value)) tones.push("practical");
  if (/\bunderstated\b|\bnot over(?:done| the top)\b|\brestrained\b/.test(value)) tones.push("restrained");
  if (/\bfun\b|\bexpressive\b|\bstatement\b/.test(value)) tones.push("expressive");
  if (/\bapproachable\b|\bfriendly\b/.test(value)) tones.push("approachable");

  if (/\bwalk(?:ing)?\b|\bon my feet\b/.test(value)) purposes.push("walking");
  if (/\bstand(?:ing)?\b/.test(value)) purposes.push("standing");
  if (/\bhands[- ]free\b/.test(value)) purposes.push("hands-free");
  if (/\bpockets?\b|\bsecure(?:ly)? carry\b/.test(value)) purposes.push("secure-carrying");
  if (/\brain\b|\bweather[- ]appropriate\b/.test(value)) purposes.push("weather-protection");
  if (/\beasy\b|\blow[- ]effort\b|\bnot fussy\b/.test(value)) purposes.push("easy-adjustment");

  if (/\bcomfortable\b|\bcomfort\b/.test(value)) {
    required.push("comfortable");
    comfort.push({ kind: "movement", intensity: "required" });
  }
  if (/\bbreathable\b|\bvery hot\b|\bhot weather\b/.test(value)) {
    required.push("breathable", "weather-appropriate");
    comfort.push({ kind: "temperature", intensity: "required" });
  }
  if (/\bwalkable\b|\bcomfortable shoes?\b|\bflat shoes?\b/.test(value)) required.push("walkable");
  if (/\bcohesive\b|\bmatch(?:es|ing)?\b/.test(value)) required.push("cohesive");
  if (/\bsecure\b|\bpockets? required\b|\bneed pockets?\b/.test(value)) required.push("secure");
  if (/\bnot fussy\b|\bno fuss\b/.test(value)) required.push("understated");

  if (/\bflat shoes?\b|\bno heels?\b/.test(value)) {
    footwear.push({ kind: "heel-height", operator: "at-most", value: "flat" });
  } else if (/\blow heels?\b/.test(value)) {
    footwear.push({ kind: "heel-height", operator: "at-most", value: "low" });
  }
  if (/\bcomfortable shoes?\b|\bsustained walking\b|\ba lot of walking\b|\bon my feet\b/.test(value)) {
    footwear.push({ kind: "walking", value: "sustained" });
  }
  if (/\bno (?:pumps?|heels?)\b/.test(value)) {
    footwear.push({ kind: "genre", operator: "prohibit", value: "pump" });
    footwear.push({ kind: "genre", operator: "prohibit", value: "heel" });
  }
  if (/\bno boots?\b/.test(value)) footwear.push({ kind: "genre", operator: "prohibit", value: "boot" });

  if (/\bno bag\b|\bcan(?:not|'t) carry a bag\b/.test(value)) carrying.push({ kind: "bag", value: "prohibited" });
  else if (/\bneed a bag\b|\bbag required\b/.test(value)) carrying.push({ kind: "bag", value: "required" });
  if (/\bneed pockets?\b|\bpockets? required\b/.test(value)) {
    carrying.push({ kind: "secure-storage", value: "pocket-required" });
  }
  if (/\bhands[- ]free\b/.test(value)) carrying.push({ kind: "hands-free", value: true });

  if (/\bsustained walking\b|\ba lot of walking\b|\bon my feet\b/.test(value)) movement.push({ kind: "walking", value: "high" });
  else if (/\bwalking\b|\btouring\b|\bshopping\b/.test(value)) movement.push({ kind: "walking", value: "moderate" });
  if (/\bstanding\b|\bon my feet\b/.test(value)) movement.push({ kind: "standing", value: "high" });
  if (/\bshoulders? covered\b|\bcover(?:ed)? shoulders?\b/.test(value)) {
    coverage.push({ kind: "shoulder-coverage", value: "required" });
  }
  if (/\bconservative\b|\bmodest\b/.test(value)) {
    // "Conservative" is not converted into a stereotype. Only explicit, concrete
    // coverage language can create a coverage requirement.
    tones.push("restrained");
  }

  if (tones.length) meaning.desiredTone = unique(tones);
  if (purposes.length) meaning.practicalPurpose = unique(purposes);
  if (required.length) meaning.requiredQualities = unique(required);
  if (avoided.length) meaning.avoidedQualities = unique(avoided);
  if (comfort.length) meaning.comfortRequirements = comfort;
  if (coverage.length) meaning.coverageRequirements = coverage;
  if (footwear.length) meaning.footwearRequirements = footwear;
  if (carrying.length) meaning.carryingNeeds = carrying;
  if (movement.length) meaning.movementRequirements = movement;
  return meaning;
}

function mergeMeaning(inferred: ConfirmedCustomerMeaning, confirmed?: ConfirmedCustomerMeaning) {
  if (!confirmed) return inferred;
  return {
    ...inferred,
    ...confirmed,
    desiredTone: unique([...(inferred.desiredTone ?? []), ...(confirmed.desiredTone ?? [])]),
    practicalPurpose: unique([...(inferred.practicalPurpose ?? []), ...(confirmed.practicalPurpose ?? [])]),
    requiredQualities: unique([...(inferred.requiredQualities ?? []), ...(confirmed.requiredQualities ?? [])]),
    avoidedQualities: unique([...(inferred.avoidedQualities ?? []), ...(confirmed.avoidedQualities ?? [])]),
    comfortRequirements: [...(inferred.comfortRequirements ?? []), ...(confirmed.comfortRequirements ?? [])],
    coverageRequirements: [...(inferred.coverageRequirements ?? []), ...(confirmed.coverageRequirements ?? [])],
    footwearRequirements: [...(inferred.footwearRequirements ?? []), ...(confirmed.footwearRequirements ?? [])],
    carryingNeeds: [...(inferred.carryingNeeds ?? []), ...(confirmed.carryingNeeds ?? [])],
    movementRequirements: [...(inferred.movementRequirements ?? []), ...(confirmed.movementRequirements ?? [])],
    explicitItemInstructions: confirmed.explicitItemInstructions ?? inferred.explicitItemInstructions,
  } satisfies ConfirmedCustomerMeaning;
}

function assertInputOwnership(input: BuildCustomerDressingBriefInput) {
  for (const statement of input.statements ?? []) {
    if (!CUSTOMER_DIRECTIVE_AUTHORITIES.has(statement.evidenceRef.authority)) {
      throw new Error("Only customer-authorized evidence may create request directives");
    }
    if (statement.evidenceRef.ownerUserId !== input.ownerUserId) {
      throw new Error("Customer Dressing Brief statement owner mismatch");
    }
  }
  for (const profile of input.profileDefaults ?? []) {
    if (profile.evidenceRef.ownerUserId !== input.ownerUserId) {
      throw new Error("Customer Dressing Brief profile owner mismatch");
    }
    if (!["customer-durable", "inference"].includes(profile.evidenceRef.authority)) {
      throw new Error("Profile defaults require durable customer or inferred profile evidence");
    }
  }
}

export function buildCustomerDressingBrief(
  input: BuildCustomerDressingBriefInput,
): CustomerDressingBrief {
  assertInputOwnership(input);
  const statements = (input.statements ?? []).filter(({ text }) => text.trim());
  const meanings = statements.map((statement) => ({
    statement,
    meaning: mergeMeaning(inferConfirmedMeaning(statement.text), statement.confirmedMeaning),
  }));
  const currentEvidence = statements.map(({ evidenceRef }) => evidenceRef);
  const profileDefaults = input.profileDefaults ?? [];
  const allEvidence = unique([
    ...currentEvidence,
    ...profileDefaults.map(({ evidenceRef }) => evidenceRef),
    ...(input.activeCorrections ?? []).map(({ evidenceRef }) => evidenceRef),
    ...(input.activeSuppressions ?? []).map(({ evidenceRef }) => evidenceRef),
  ]);
  const currentTones = unique(meanings.flatMap(({ meaning }) => meaning.desiredTone ?? []));
  const currentQualities = new Set(meanings.flatMap(({ meaning }) => meaning.requiredQualities ?? []));
  const currentAvoided = new Set(meanings.flatMap(({ meaning }) => meaning.avoidedQualities ?? []));
  const profileEvidence = profileDefaults.map(({ evidenceRef }) => evidenceRef);
  const normalizedEvidence = currentEvidence.length ? currentEvidence : profileEvidence;
  const unresolved = meanings
    .filter(({ meaning }) => Object.values(meaning).every((entry) => entry === undefined || (Array.isArray(entry) && entry.length === 0)))
    .map(({ statement }, index) => ({
      kind: "unresolved-customer-language" as const,
      text: statement.text,
      status: "display-and-audit-only" as const,
      mayDriveDecision: false as const,
      evidenceRefs: [statement.evidenceRef],
      index,
    }));

  const desiredImpression: GovernedPreference[] = dedupe([
    ...meanings.flatMap(({ statement, meaning }) =>
      (meaning.desiredImpression ?? []).map((value) => withEvidence(value, statement.evidenceRef))),
    ...profileDefaults.flatMap((profile) =>
      (profile.desiredImpression ?? [])
        .filter(({ quality }) => !currentQualities.has(quality) && !currentAvoided.has(quality))
        .map((value) => withEvidence(value, profile.evidenceRef))),
    ...profileDefaults.flatMap((profile) =>
      (profile.preferredQualities ?? [])
        .filter((quality) => !currentQualities.has(quality) && !currentAvoided.has(quality))
        .map((quality) => withEvidence({ quality, strength: "light" as const }, profile.evidenceRef))),
  ]);
  const requiredQualities: GovernedRequirement[] = dedupe(meanings.flatMap(({ statement, meaning }) =>
    (meaning.requiredQualities ?? []).map((quality) => withEvidence({ quality }, statement.evidenceRef))));
  const avoidedQualities: GovernedProhibition[] = dedupe(meanings.flatMap(({ statement, meaning }) =>
    (meaning.avoidedQualities ?? []).map((quality) => withEvidence({ quality }, statement.evidenceRef))));

  const comfortRequirements = dedupe([
    ...meanings.flatMap(({ statement, meaning }) =>
      (meaning.comfortRequirements ?? []).map((value) => withEvidence(value, statement.evidenceRef))),
    ...profileDefaults.flatMap((profile) =>
      (profile.comfortPreferences ?? []).map((value) =>
        withEvidence({ ...value, intensity: "preferred" as const }, profile.evidenceRef))),
  ]);
  const explicitItemInstructions = dedupe(meanings.flatMap(({ statement, meaning }) =>
    (meaning.explicitItemInstructions ?? []).map((instruction) => withEvidence({
      ...instruction,
      displayLanguage: statement.text,
    }, statement.evidenceRef))));
  const explicitInstructions = unique(explicitItemInstructions.map(({ normalizedAction }) =>
    normalizedAction as InstructionId));
  const carryingNeeds = dedupe(meanings.flatMap(({ statement, meaning }) =>
    (meaning.carryingNeeds ?? []).map((value) => withEvidence(value, statement.evidenceRef))));
  const footwearRequirements = dedupe(meanings.flatMap(({ statement, meaning }) =>
    (meaning.footwearRequirements ?? []).map((value) => withEvidence(value, statement.evidenceRef))));
  const unresolvedConsequential = unresolved.filter(({ text }) =>
    /\b(must|need|required|only|never|avoid|cannot|can't|no)\b/i.test(text));
  const conflicts: Array<{ subject: string; evidenceRefs: EvidenceRef[] }> = [];
  const bagValues = new Set(carryingNeeds.filter(({ kind }) => kind === "bag").map(({ value }) => value));
  if (bagValues.has("required") && bagValues.has("prohibited")) {
    conflicts.push({
      subject: "Whether a bag is required or prohibited",
      evidenceRefs: carryingNeeds.filter(({ kind }) => kind === "bag").flatMap(({ evidenceRefs }) => evidenceRefs),
    });
  }
  for (const quality of currentQualities) {
    if (currentAvoided.has(quality)) {
      conflicts.push({
        subject: `Whether ${quality.replaceAll("-", " ")} is required or avoided`,
        evidenceRefs: [
          ...requiredQualities.filter((entry) => entry.quality === quality).flatMap(({ evidenceRefs }) => evidenceRefs),
          ...avoidedQualities.filter((entry) => entry.quality === quality).flatMap(({ evidenceRefs }) => evidenceRefs),
        ],
      });
    }
  }
  const consequentialUnknowns = [
    ...unresolvedConsequential.map(({ text, evidenceRefs }, index) => ({
      unknownId: `${input.artifactId}:unresolved:${index + 1}`,
      subject: text,
      consequence: "changes-viability" as const,
      focusedQuestion: `When you say “${text},” what must the outfit do or avoid?`,
      evidenceRefs,
    })),
    ...conflicts.map((conflict, index) => ({
      unknownId: `${input.artifactId}:conflict:${index + 1}`,
      subject: conflict.subject,
      consequence: "changes-viability" as const,
      focusedQuestion: `${conflict.subject}?`,
      evidenceRefs: conflict.evidenceRefs,
    })),
  ];
  const manageableAssumptions = [
    ...unresolved
      .filter((entry) => !unresolvedConsequential.includes(entry))
      .map(({ text, evidenceRefs }, index) => ({
        assumptionId: `${input.artifactId}:manageable:${index + 1}`,
        statement: `“${text}” remains visible context but does not create a garment rule.`,
        consequence: "low" as const,
        evidenceRefs,
      })),
    ...(statements.length || profileDefaults.length ? [] : [{
      assumptionId: `${input.artifactId}:neutral-profile`,
      statement: "No personal dressing direction was supplied, so Curated will remain neutral.",
      consequence: "low" as const,
      evidenceRefs: [] as EvidenceRef[],
    }]),
  ];

  const brief: CustomerDressingBrief = {
    schemaVersion: CUSTOMER_DRESSING_BRIEF_VERSION,
    taxonomyVersion: RECOMMENDATION_V2_TAXONOMY_VERSION,
    artifactId: input.artifactId,
    artifactRevision: input.artifactRevision,
    requestId: input.requestId,
    ownerUserId: input.ownerUserId,
    generatedAt: input.generatedAt,
    evidenceRefs: allEvidence,
    originalLanguage: statements.map(({ text, evidenceRef }) => ({ text, evidenceRef })),
    normalizedIntent: {
      occasion: meanings.find(({ meaning }) => meaning.occasion)?.meaning.occasion ?? null,
      desiredTone: currentTones.length
        ? currentTones
        : unique(profileDefaults.flatMap(({ desiredTone }) => desiredTone ?? [])),
      practicalPurpose: unique(meanings.flatMap(({ meaning }) => meaning.practicalPurpose ?? [])),
      explicitInstructions,
      unresolvedLanguage: unresolved.map(({ kind, text, status, mayDriveDecision, evidenceRefs }) => ({
        kind,
        text,
        status,
        mayDriveDecision,
        evidenceRefs,
      })),
      confidence: currentEvidence.length ? (unresolved.length ? "medium" : "high") : "low",
      evidenceRefs: normalizedEvidence,
    },
    desiredImpression,
    requiredQualities,
    avoidedQualities,
    comfortRequirements,
    accessibilityRequirements: [],
    coverageRequirements: dedupe(meanings.flatMap(({ statement, meaning }) =>
      (meaning.coverageRequirements ?? []).map((value) => withEvidence(value, statement.evidenceRef)))),
    footwearRequirements,
    carryingNeeds,
    movementRequirements: dedupe(meanings.flatMap(({ statement, meaning }) =>
      (meaning.movementRequirements ?? []).map((value) => withEvidence(value, statement.evidenceRef)))),
    explicitItemInstructions,
    activeCorrections: input.activeCorrections ?? [],
    activeSuppressions: input.activeSuppressions ?? [],
    consequentialUnknowns,
    manageableAssumptions,
    confidence: currentEvidence.length ? (unresolved.length ? "medium" : "high") : "low",
  };
  const validation = validateCustomerDressingBrief(brief);
  if (!validation.success) {
    throw new Error(`Invalid Customer Dressing Brief: ${validation.errors.join("; ")}`);
  }
  return brief;
}

export function confirmCustomerDressingBrief(
  brief: CustomerDressingBrief,
): CustomerDressingBriefConfirmation {
  const understood: string[] = [];
  if (brief.normalizedIntent.occasion) understood.push(`Occasion: ${brief.normalizedIntent.occasion.replaceAll("-", " ")}.`);
  if (brief.normalizedIntent.desiredTone.length) understood.push(`Direction: ${brief.normalizedIntent.desiredTone.join(", ").replaceAll("-", " ")}.`);
  if (brief.requiredQualities.length) understood.push(`I’ll protect: ${brief.requiredQualities.map(({ quality }) => quality).join(", ").replaceAll("-", " ")}.`);
  if (brief.footwearRequirements.length) understood.push("I’ll apply your footwear requirements before considering a look.");
  if (brief.carryingNeeds.length) understood.push("I’ll apply your carrying needs before considering a look.");
  if (brief.explicitItemInstructions.length) understood.push("Your item-specific instruction is active for its stated scope.");
  const unresolved = brief.normalizedIntent.unresolvedLanguage.map(({ text }) =>
    `I have kept “${text}” in your notes, but have not turned it into a hidden rule.`);
  return {
    headline: understood.length ? "Here is what I understood." : "I’ll keep the direction neutral.",
    understood,
    unresolved,
    question: brief.consequentialUnknowns[0]?.focusedQuestion ?? null,
  };
}
