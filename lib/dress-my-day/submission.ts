export type PlanDraft = {
  title: string;
  time: string;
  location: string;
  dressCode: string;
  notes: string;
};

export function buildDailyEventPayload(
  draft: PlanDraft,
  eventDate: string,
  startsAt: string | null,
) {
  return {
    eventDate,
    startsAt,
    title: draft.title,
    location: draft.location || null,
    dressCode: draft.dressCode || null,
    notes: draft.notes || null,
  };
}

export type PlanSubmissionState = {
  phase: "idle" | "saving" | "generating" | "success" | "error";
  draft: PlanDraft | null;
  eventId: string | null;
  error: string | null;
};

export const initialPlanSubmissionState: PlanSubmissionState = {
  phase: "idle",
  draft: null,
  eventId: null,
  error: null,
};

export type PlanSubmissionAction =
  | { type: "submit"; draft: PlanDraft }
  | { type: "saved"; eventId: string }
  | { type: "recommendations-ready" }
  | { type: "failed"; error: string; eventId?: string | null }
  | { type: "reset" };

export function planSubmissionReducer(
  state: PlanSubmissionState,
  action: PlanSubmissionAction,
): PlanSubmissionState {
  switch (action.type) {
    case "submit":
      return { phase: "saving", draft: action.draft, eventId: null, error: null };
    case "saved":
      return { ...state, phase: "generating", eventId: action.eventId, error: null };
    case "recommendations-ready":
      return { ...state, phase: "success", error: null };
    case "failed":
      return {
        ...state,
        phase: "error",
        eventId: action.eventId === undefined ? state.eventId : action.eventId,
        error: action.error,
      };
    case "reset":
      return initialPlanSubmissionState;
  }
}

export function shouldSubmitPlanOnEnter(input: {
  key: string;
  shiftKey: boolean;
  isComposing: boolean;
}) {
  return input.key === "Enter" && !input.shiftKey && !input.isComposing;
}

export function hasUsableRecommendationOptions(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 3;
}

type RecoverableEvent<Option> = {
  id: string;
  recommendationOptions?: Option[] | null;
};

/**
 * A timed-out recommendation request is not a failed one: the server persists
 * the finished set regardless. Given a freshly reloaded day, return that event's
 * options when they are usable, or null when there is nothing worth rendering.
 */
export function recoverableOptionsFromEvents<Option>(
  items: ReadonlyArray<RecoverableEvent<Option> | null | undefined> | null | undefined,
  eventId: string,
): Option[] | null {
  if (!Array.isArray(items)) return null;
  const options = items.find((event) => event?.id === eventId)?.recommendationOptions ?? [];
  // Materialize the guard as a plain boolean. Its `unknown[]` type predicate
  // would otherwise widen the caller's option type through the narrowing.
  const usable: boolean = hasUsableRecommendationOptions(options);
  return usable ? options : null;
}
