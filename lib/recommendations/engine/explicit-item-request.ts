import { wardrobeItemLabel } from "@/lib/wardrobe/item-label";
import type { EngineWardrobeItem } from "./types";

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function words(value: string) {
  return new Set(normalized(value).split(" ").filter((word) => word.length > 1));
}

function requestDescribesItem(request: string, itemDescription: string) {
  const requestWords = words(request);
  const itemWords = words(itemDescription);
  return requestWords.size >= 2 && [...requestWords].every((word) => itemWords.has(word));
}

export function resolveExplicitlyRequestedItemIds(
  wardrobe: EngineWardrobeItem[],
  text: string | null | undefined,
) {
  if (!text) return [];
  const requests = [...text.matchAll(/\b(?:(?:i\s+)?(?:want|need|plan|would like)\s+to\s+wear|(?:every\s+(?:option|outfit|look)\s+)?must\s+include|(?:please\s+)?include)\s+(?:my\s+)?([^.!?;,]+)/gi)]
    .map((match) => normalized(match[1]))
    .filter(Boolean);
  if (!requests.length) return [];
  return wardrobe.flatMap((item) => {
    const label = normalized(wardrobeItemLabel(item));
    const name = normalized(item.item_name ?? "");
    const designer = normalized(item.designer ?? "");
    const matched = requests.some((request) =>
      (name && request.includes(name)) ||
      (request.length >= 4 && label.includes(request)) ||
      requestDescribesItem(request, label) ||
      (designer && name && request.includes(designer) && request.includes(name))
    );
    return matched ? [item.id] : [];
  });
}
