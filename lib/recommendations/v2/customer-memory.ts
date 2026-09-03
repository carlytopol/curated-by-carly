import {
  authorizeCustomerStateMutation,
  type CustomerStateMutationAuthorization,
} from "./authority";
import type {
  CeremonyAllowance,
  DayCharacter,
  EffortLevel,
  FormalityLevel,
  OccasionId,
  QualityId,
  SocialStakes,
} from "./taxonomy";

export const CUSTOMER_MEMORY_COMMAND_VERSION = "customer-memory-command.v2.2.0" as const;
export const CUSTOMER_MEMORY_RECORD_VERSION = "customer-memory-record.v2.2.0" as const;
export const SIMILAR_CONTEXT_MATCHER_VERSION = "similar-context-matcher.v2.2.0" as const;

export type TodayOnlyScope = {
  kind: "today-only";
  /** A fixed civil day. A later profile-timezone change never moves this memory. */
  localDate: string;
  timezone: string;
  timezoneBehavior: "fixed-at-creation";
  dailyEventId: string | null;
};

export type SimilarContextMatcher = {
  matcherVersion: typeof SIMILAR_CONTEXT_MATCHER_VERSION;
  occasion: OccasionId;
  dayCharacter: DayCharacter | null;
  socialStakes: SocialStakes | null;
};

export type SimilarContextConfirmation = {
  status: "pending" | "confirmed";
  plainLanguageDescription: string;
  confirmedByUserId: string | null;
  confirmedAt: string | null;
  matcherVersionPresented: typeof SIMILAR_CONTEXT_MATCHER_VERSION;
};

export type SimilarContextScope = {
  kind: "similar-contexts";
  matcher: SimilarContextMatcher;
  confirmation: SimilarContextConfirmation;
};

export type UntilRestoredScope = { kind: "until-restored" };
export type CustomerMemoryScope = TodayOnlyScope | SimilarContextScope | UntilRestoredScope;

export type RecommendationContextIdentity = {
  ownerUserId: string;
  localDate: string;
  timezone: string;
  dailyEventId: string | null;
  occasion: OccasionId | null;
  dayCharacter: DayCharacter | null;
  socialStakes: SocialStakes | null;
};

type InstructionAction = "require" | "prefer" | "avoid" | "prohibit";
type DirectionAction = "prefer" | "avoid" | "prohibit";

export type CorrectionDirective =
  | { kind: "item-instruction"; itemId: string; action: "require-item" | "prefer-item" | "avoid-item" | "prohibit-item" }
  | { kind: "quality-instruction"; quality: QualityId; action: InstructionAction }
  | { kind: "outfit-relationship"; firstItemId: string; secondItemId: string; relationship: "works-together" | "does-not-work-together" }
  | { kind: "current-intention"; intention: string }
  | { kind: "event-context"; occasion: OccasionId; action: "set" }
  | { kind: "formality"; floor: FormalityLevel | null; ceiling: FormalityLevel | null }
  | { kind: "ceremony"; allowance: CeremonyAllowance }
  | { kind: "effort"; level: EffortLevel }
  | { kind: "comfort"; subject: "temperature" | "movement" | "sensory" | "adjustment"; action: InstructionAction }
  | { kind: "coverage"; subject: "shoulders" | "neckline" | "hem" | "opacity" | "fit-exposure"; action: InstructionAction; value: string }
  | { kind: "footwear"; subject: "heel-height" | "walking" | "stability" | "genre"; action: InstructionAction; value: string }
  | { kind: "carrying"; subject: "bag" | "secure-storage" | "hands-free"; action: InstructionAction; value: string }
  | { kind: "accessibility"; subject: "mobility" | "dexterity" | "sensory" | "medical" | "other"; requirement: string }
  /** Canonical fact: changes item truth, never a preference. */
  | { kind: "garment-fact"; itemId: string; fact: "has-pockets" | "material" | "fit" | "coverage" | "comfort"; value: string }
  | { kind: "garment-occasion-role"; itemId: string; occasion: OccasionId; action: DirectionAction }
  | { kind: "outfit-direction"; direction: string; action: DirectionAction }
  | { kind: "piece-change"; itemId: string; action: "replace" | "remove" };

export type CustomerCorrection = {
  recordVersion: typeof CUSTOMER_MEMORY_RECORD_VERSION;
  id: string;
  ownerUserId: string;
  status: "active" | "restored" | "superseded";
  scope: CustomerMemoryScope;
  originalLanguage: string;
  directive: CorrectionDirective;
  authority: "customer-current" | "authorized-customer-service";
  revision: number;
  supersedesRecordId: string | null;
  createdAt: string;
  restoredAt: string | null;
};

export type RecommendationSuppression = {
  recordVersion: typeof CUSTOMER_MEMORY_RECORD_VERSION;
  id: string;
  ownerUserId: string;
  itemId: string;
  status: "active" | "restored" | "superseded";
  scope: CustomerMemoryScope;
  originalLanguage: string;
  authority: "customer-current" | "authorized-customer-service";
  revision: number;
  supersedesRecordId: string | null;
  createdAt: string;
  restoredAt: string | null;
};

export type CustomerMemoryRevisions = { correctionRevision: number; suppressionRevision: number };

type CreateCorrection = {
  commandVersion: typeof CUSTOMER_MEMORY_COMMAND_VERSION;
  kind: "create-correction";
  authorization: CustomerStateMutationAuthorization;
  scope: CustomerMemoryScope;
  originalLanguage: string;
  directive: CorrectionDirective;
  supersedesRecordId?: string;
};
type CreateSuppression = {
  commandVersion: typeof CUSTOMER_MEMORY_COMMAND_VERSION;
  kind: "create-suppression";
  authorization: CustomerStateMutationAuthorization;
  scope: CustomerMemoryScope;
  originalLanguage: string;
  itemId: string;
  supersedesRecordId?: string;
};
type RestoreCorrection = {
  commandVersion: typeof CUSTOMER_MEMORY_COMMAND_VERSION;
  kind: "restore-correction";
  authorization: CustomerStateMutationAuthorization;
  recordId: string;
};
type RestoreSuppression = {
  commandVersion: typeof CUSTOMER_MEMORY_COMMAND_VERSION;
  kind: "restore-suppression";
  authorization: CustomerStateMutationAuthorization;
  recordId: string;
};
export type CustomerMemoryCommand = CreateCorrection | CreateSuppression | RestoreCorrection | RestoreSuppression;

export type PersistedCustomerMemoryMutation = {
  recordId: string;
  ownerUserId: string;
  recordKind: "correction" | "suppression";
  operation: "created" | "restored" | "superseded";
  scope: CustomerMemoryScope;
  revisions: CustomerMemoryRevisions;
  auditRecordId: string | null;
};

export interface CustomerMemoryRepository {
  executeAuthorized(command: CustomerMemoryCommand): Promise<PersistedCustomerMemoryMutation>;
}

export type CustomerMemoryExecutionResult =
  | {
      success: true;
      mutation: PersistedCustomerMemoryMutation;
      customerMessage: string;
      rememberedMessage: string;
      cacheInvalidation: CustomerMemoryRevisions & { ownerUserId: string };
    }
  | { success: false; retryable: boolean; reason: string; preservedInput: string | null };

export function isRealCivilDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

export function isCanonicalIanaTimezone(value: string) {
  if (!value.trim()) return false;
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: value }).resolvedOptions().timeZone === value;
  } catch {
    return false;
  }
}

function validTimestamp(value: string | null) {
  return value !== null && Number.isFinite(Date.parse(value));
}

export function validateCustomerMemoryScope(scope: CustomerMemoryScope, ownerUserId?: string): string[] {
  if (scope.kind === "until-restored") return [];
  if (scope.kind === "today-only") {
    const errors: string[] = [];
    if (!isRealCivilDate(scope.localDate)) errors.push("today-only scope requires a real calendar date");
    if (!isCanonicalIanaTimezone(scope.timezone)) errors.push("today-only scope requires a canonical IANA timezone");
    if (scope.timezoneBehavior !== "fixed-at-creation") errors.push("today-only scope must remain fixed to its creation timezone");
    return errors;
  }
  const { matcher, confirmation } = scope;
  const errors: string[] = [];
  if (matcher.matcherVersion !== SIMILAR_CONTEXT_MATCHER_VERSION) errors.push("unsupported similar-context matcher version");
  if (!matcher.occasion) errors.push("similar-context scope requires an occasion");
  if (!matcher.dayCharacter && !matcher.socialStakes) errors.push("similar-context scope requires day character or social stakes");
  if (confirmation.matcherVersionPresented !== matcher.matcherVersion) errors.push("confirmed matcher version does not match normalized matcher");
  if (!confirmation.plainLanguageDescription.trim() || /^similar (contexts|occasions)$/i.test(confirmation.plainLanguageDescription.trim())) {
    errors.push("similar-context scope requires a specific customer-readable description");
  }
  if (confirmation.status !== "confirmed") errors.push("similar-context scope requires customer confirmation");
  if (!confirmation.confirmedByUserId || (ownerUserId && confirmation.confirmedByUserId !== ownerUserId)) {
    errors.push("similar-context scope must be confirmed by the target customer");
  }
  if (!validTimestamp(confirmation.confirmedAt)) errors.push("similar-context scope requires a valid confirmation timestamp");
  return errors;
}

const CORRECTION_DIRECTIVE_KINDS = new Set<CorrectionDirective["kind"]>([
  "item-instruction",
  "quality-instruction",
  "outfit-relationship",
  "current-intention",
  "event-context",
  "formality",
  "ceremony",
  "effort",
  "comfort",
  "coverage",
  "footwear",
  "carrying",
  "accessibility",
  "garment-fact",
  "garment-occasion-role",
  "outfit-direction",
  "piece-change",
]);

export function validateCorrectionDirective(value: unknown): string[] {
  if (!value || typeof value !== "object") return ["correction directive is required"];
  const directive = value as Record<string, unknown>;
  if (typeof directive.kind !== "string" || !CORRECTION_DIRECTIVE_KINDS.has(directive.kind as CorrectionDirective["kind"])) {
    return ["unsupported correction directive"];
  }
  const errors: string[] = [];
  const requireText = (field: string) => {
    if (typeof directive[field] !== "string" || !(directive[field] as string).trim()) {
      errors.push(`${directive.kind} requires ${field}`);
    }
  };
  if (["item-instruction", "garment-fact", "garment-occasion-role", "piece-change"].includes(directive.kind)) requireText("itemId");
  if (directive.kind === "outfit-relationship") {
    requireText("firstItemId");
    requireText("secondItemId");
  }
  if (directive.kind === "current-intention") requireText("intention");
  if (directive.kind === "outfit-direction") requireText("direction");
  if (directive.kind === "accessibility") requireText("requirement");
  if (["coverage", "footwear", "carrying", "garment-fact"].includes(directive.kind)) requireText("value");
  return errors;
}

export function customerMemoryScopeMatches(
  scope: CustomerMemoryScope,
  context: RecommendationContextIdentity,
) {
  if (scope.kind === "until-restored") return true;
  if (scope.kind === "today-only") {
    if (!isRealCivilDate(context.localDate) || !isCanonicalIanaTimezone(context.timezone)) return false;
    if (scope.localDate !== context.localDate || scope.timezone !== context.timezone) return false;
    return scope.dailyEventId === null || scope.dailyEventId === context.dailyEventId;
  }
  if (validateCustomerMemoryScope(scope, context.ownerUserId).length) return false;
  const matcher = scope.matcher;
  if (context.occasion !== matcher.occasion) return false;
  if (matcher.dayCharacter && context.dayCharacter !== matcher.dayCharacter) return false;
  if (matcher.socialStakes && context.socialStakes !== matcher.socialStakes) return false;
  return true;
}

export function describeScope(scope: CustomerMemoryScope) {
  if (scope.kind === "today-only") return `only on ${scope.localDate}`;
  if (scope.kind === "similar-contexts") return scope.confirmation.plainLanguageDescription;
  return "until you restore it";
}

function commandInput(command: CustomerMemoryCommand) {
  return command.kind === "create-correction" || command.kind === "create-suppression"
    ? command.originalLanguage
    : null;
}

export async function executeCustomerMemoryCommand(
  repository: CustomerMemoryRepository,
  command: CustomerMemoryCommand,
): Promise<CustomerMemoryExecutionResult> {
  if (command.commandVersion !== CUSTOMER_MEMORY_COMMAND_VERSION) {
    return { success: false, retryable: false, reason: "unsupported command version", preservedInput: commandInput(command) };
  }
  const authorization = authorizeCustomerStateMutation(command.authorization);
  if (!authorization.authorized) {
    return { success: false, retryable: false, reason: authorization.reason, preservedInput: commandInput(command) };
  }
  const owner = command.authorization.targetUserId;
  if (!owner.trim()) return { success: false, retryable: false, reason: "target customer is required", preservedInput: commandInput(command) };
  if (command.kind === "create-correction" || command.kind === "create-suppression") {
    const errors = validateCustomerMemoryScope(command.scope, owner);
    if (!command.originalLanguage.trim()) errors.push("original customer language is required");
    if (command.kind === "create-correction") errors.push(...validateCorrectionDirective(command.directive));
    if (command.kind === "create-suppression" && !command.itemId.trim()) errors.push("suppression item is required");
    if (errors.length) return { success: false, retryable: false, reason: errors.join("; "), preservedInput: command.originalLanguage };
  }
  try {
    const mutation = await repository.executeAuthorized(command);
    if (mutation.ownerUserId !== owner) {
      return { success: false, retryable: false, reason: "persistence owner mismatch", preservedInput: commandInput(command) };
    }
    if (authorization.auditRequired && !mutation.auditRecordId) {
      return { success: false, retryable: false, reason: "authorized service mutation is missing its audit record", preservedInput: commandInput(command) };
    }
    const restored = mutation.operation === "restored";
    return {
      success: true,
      mutation,
      customerMessage: restored
        ? `Restored. Curated will no longer apply this ${mutation.recordKind}.`
        : `Understood. ${describeScope(mutation.scope)}`,
      rememberedMessage: restored
        ? "The original note remains in your history, but it is no longer active."
        : mutation.scope.kind === "today-only"
          ? "This is remembered only for that selected day."
          : mutation.scope.kind === "similar-contexts"
            ? `${mutation.scope.confirmation.plainLanguageDescription} You can review or restore this in Your Style Notes.`
            : "This remains in effect until you restore it in Your Style Notes.",
      cacheInvalidation: { ownerUserId: mutation.ownerUserId, ...mutation.revisions },
    };
  } catch {
    return {
      success: false,
      retryable: true,
      reason: "Curated could not save that note yet. Nothing was changed.",
      preservedInput: commandInput(command),
    };
  }
}
