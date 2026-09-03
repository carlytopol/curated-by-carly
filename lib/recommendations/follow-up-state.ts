export type FollowUpMessage = { role: "user" | "assistant"; content: string };

export type FollowUpSubmissionState = {
  draft: string;
  pendingText: string | null;
  phase: "idle" | "loading" | "success" | "error";
  messages: FollowUpMessage[];
  notice: string;
};

export type FollowUpSubmissionAction =
  | { type: "draft"; value: string }
  | { type: "hydrate"; messages: FollowUpMessage[] }
  | { type: "submit"; text: string; notice: string }
  | { type: "succeed"; answer: string; notice: string }
  | { type: "fail"; notice: string }
  | { type: "notice"; notice: string }
  | { type: "clear" };

export const initialFollowUpSubmissionState: FollowUpSubmissionState = {
  draft: "",
  pendingText: null,
  phase: "idle",
  messages: [],
  notice: "",
};

export function followUpSubmissionReducer(
  state: FollowUpSubmissionState,
  action: FollowUpSubmissionAction,
): FollowUpSubmissionState {
  switch (action.type) {
    case "draft":
      return { ...state, draft: action.value };
    case "hydrate":
      return { ...state, messages: action.messages };
    case "submit":
      if (state.phase === "loading") return state;
      return {
        ...state,
        draft: action.text,
        pendingText: action.text,
        phase: "loading",
        notice: action.notice,
      };
    case "succeed":
      if (!state.pendingText) return state;
      return {
        ...state,
        draft: "",
        pendingText: null,
        phase: "success",
        messages: [
          ...state.messages,
          { role: "user", content: state.pendingText },
          { role: "assistant", content: action.answer },
        ],
        notice: action.notice,
      };
    case "fail":
      return {
        ...state,
        draft: state.pendingText ?? state.draft,
        pendingText: null,
        phase: "error",
        notice: action.notice,
      };
    case "notice":
      return { ...state, notice: action.notice };
    case "clear":
      return { ...initialFollowUpSubmissionState };
  }
}

export function shouldSubmitFollowUpOnKey(input: {
  key: string;
  shiftKey: boolean;
  isComposing: boolean;
}) {
  return input.key === "Enter" && !input.shiftKey && !input.isComposing;
}

export function suggestedFollowUpAction(choice: string): "submit" | "focus-custom" {
  return choice === "Something else" ? "focus-custom" : "submit";
}

export type RegeneratedChatOption = {
  summary: string;
  rationale: string | null;
  wardrobeItems: Array<{ label: string }>;
};

export function formatRegeneratedOptionsForChat(options: RegeneratedChatOption[]) {
  if (!options.length) return "";
  const lines = options.slice(0, 3).map((option, index) => {
    const description = option.rationale?.trim() ||
      option.wardrobeItems.map((item) => item.label).filter(Boolean).join(", ");
    return `Option ${index + 1}: ${description || option.summary}`;
  });
  return `Here are the new options:\n\n${lines.join("\n\n")}`;
}
