import { classifyOccasion, inferDressCode } from "./classify";

export type ManualEventEvidence = {
  title: string;
  location?: string | null;
};

export function classifyManualEvent(event: ManualEventEvidence) {
  const evidence = {
    title: event.title,
    location: event.location ?? null,
    isAllDay: false,
  };
  const occasionClassification = classifyOccasion(evidence);
  return {
    occasionClassification,
    dressCodeInference: inferDressCode(evidence, occasionClassification),
  };
}
