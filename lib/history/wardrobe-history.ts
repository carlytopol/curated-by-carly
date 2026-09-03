type HistoryNoteInput = {
  rationale?: string | null;
  location?: string | null;
  dressCode?: string | null;
};

export function buildWardrobeHistoryNotes({
  rationale,
  location,
  dressCode,
}: HistoryNoteInput) {
  return [
    rationale?.trim() || null,
    location?.trim() ? `Location: ${location.trim()}` : null,
    dressCode?.trim() ? `Dress code: ${dressCode.trim()}` : null,
  ].filter((detail): detail is string => Boolean(detail)).join("\n");
}
