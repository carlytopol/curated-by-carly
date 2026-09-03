export type TextResponseLike = {
  output_text?: string | null;
  status?: string | null;
  incomplete_details?: { reason?: string | null } | null;
};

export function requiredResponseText(response: TextResponseLike) {
  const text = typeof response.output_text === "string" ? response.output_text.trim() : "";
  return text || null;
}
