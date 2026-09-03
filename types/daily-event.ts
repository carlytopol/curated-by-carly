export type DailyEvent = {
  id: string;
  eventDate: string;
  startsAt: string | null;
  title: string;
  location: string | null;
  dressCode: string | null;
  notes: string | null;
  position: number;
  occasionClassification?: import("./daily-agenda").OccasionClassification;
  dressCodeInference?: import("./daily-agenda").DressCodeInference;
  recommendationSetId?: string | null;
  recommendationOptions?: OutfitRecommendation[];
  recommendation?: OutfitRecommendation | null;
};

export type OutfitRecommendation = {
  id: string;
  summary: string;
  rationale: string | null;
  status: string;
  optionIndex: number;
  wardrobeItems: Array<{ id: string; label: string; category: string | null }>;
};

export type CreateDailyEventInput = Omit<DailyEvent, "id" | "position">;
