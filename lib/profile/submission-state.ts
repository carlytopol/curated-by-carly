export type ProfileSubmissionState = {
  phase: "idle" | "loading" | "saving" | "success" | "error";
  message: string;
};

export type ProfileSubmissionAction =
  | { type: "load" }
  | { type: "loaded" }
  | { type: "save" }
  | { type: "saved" }
  | { type: "failed"; message: string };

export const initialProfileSubmissionState: ProfileSubmissionState = {
  phase: "loading",
  message: "Loading your private profile…",
};

export function profileSubmissionReducer(
  state: ProfileSubmissionState,
  action: ProfileSubmissionAction,
): ProfileSubmissionState {
  switch (action.type) {
    case "load":
      return initialProfileSubmissionState;
    case "loaded":
      return { phase: "idle", message: "" };
    case "save":
      if (state.phase === "saving") return state;
      return { phase: "saving", message: "Saving privately…" };
    case "saved":
      return { phase: "success", message: "Your private profile is saved." };
    case "failed":
      return { phase: "error", message: action.message };
  }
}
