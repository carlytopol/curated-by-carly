export type IncompatibleWardrobePair = {
  itemAId: string;
  itemBId: string;
  reason?: string | null;
};

export function orderedPair(itemAId: string, itemBId: string) {
  return itemAId.localeCompare(itemBId) <= 0
    ? { itemAId, itemBId }
    : { itemAId: itemBId, itemBId: itemAId };
}

export function pairKey(itemAId: string, itemBId: string) {
  const ordered = orderedPair(itemAId, itemBId);
  return `${ordered.itemAId}|${ordered.itemBId}`;
}

export function containsIncompatiblePair(
  wardrobeItemIds: string[],
  incompatiblePairs: IncompatibleWardrobePair[],
) {
  const selected = new Set(wardrobeItemIds);
  return incompatiblePairs.some(({ itemAId, itemBId }) => selected.has(itemAId) && selected.has(itemBId));
}
