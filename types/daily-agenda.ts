import type { CalendarProvider } from "./calendar";

export type ConfidenceLevel = "low" | "medium" | "high";

export type AgendaItemKind =
  | "meeting"
  | "dinner"
  | "travel"
  | "flight"
  | "workout"
  | "social"
  | "wedding"
  | "vacation"
  | "appointment"
  | "other";

export type AgendaItemSource =
  | "manual"
  | "calendar"
  | "travel"
  | "reservation"
  | "reminder";

export type InferenceSource = "none" | "rules" | "ai" | "user";

export type OccasionClassification = {
  kind: AgendaItemKind;
  occasion: string | null;
  confidence: ConfidenceLevel;
  source: InferenceSource;
  /** Stable reason code for testing and explainability; not hidden reasoning. */
  reasonCode: string;
  correctedByUser: boolean;
};

export type DressCodeInference = {
  dressCode: string | null;
  confidence: ConfidenceLevel;
  source: InferenceSource;
  reasonCode: string;
  correctedByUser: boolean;
};

export type DailyAgendaUserCorrection = {
  kind?: AgendaItemKind;
  occasion?: string | null;
  dressCode?: string | null;
  correctedAt?: string;
};

export type DailyAgendaItem = {
  id: string;
  source: AgendaItemSource;
  title: string;
  startTime: string | null;
  endTime: string | null;
  isAllDay: boolean;
  location: string | null;
  occasionClassification: OccasionClassification;
  dressCodeInference: DressCodeInference;
  provider: CalendarProvider | null;
  calendarName: string | null;
  isReadOnly: boolean;
  userCorrection: DailyAgendaUserCorrection | null;
  hasTimeConflict: boolean;
  overlapsWithItemIds: string[];
};

export type DailyAgendaWeatherContext = {
  summary: string;
  temperature: number | null;
  precipitationChance: number | null;
  location: string | null;
  fetchedAt: string;
};

export type DailyAgenda = {
  id: string;
  date: string;
  timezone: string;
  items: DailyAgendaItem[];
  weatherContext: DailyAgendaWeatherContext | null;
  generatedAt: string;
};
