import type { CandidateLook, WardrobeGarment } from "./recommendation-pipeline";
import type { GarmentRole } from "./taxonomy";

const foundationRoles = new Set<GarmentRole>([
  "dress", "jumpsuit", "coordinated-set", "top", "bottom",
]);

export function hasStructurallyCompleteFoundation(items: WardrobeGarment[]) {
  const roles = items.map((item) => item.role);
  const count = (role: GarmentRole) => roles.filter((candidate) => candidate === role).length;
  const onePieceCount = count("dress") + count("jumpsuit") + count("coordinated-set");
  const onePiece = onePieceCount === 1 && count("top") === 0 && count("bottom") === 0;
  const separates = onePieceCount === 0 && count("top") === 1 && count("bottom") === 1;
  return (onePiece || separates) && count("shoes") === 1;
}

export function materiallyDistinctFoundations(left: CandidateLook, right: CandidateLook) {
  const foundation = (look: CandidateLook) => new Set(
    look.items.filter((item) => foundationRoles.has(item.role)).map((item) => item.itemId),
  );
  const leftFoundation = foundation(left);
  const rightFoundation = foundation(right);
  if (leftFoundation.size === 0 || rightFoundation.size === 0) return false;
  return leftFoundation.size !== rightFoundation.size
    || [...leftFoundation].some((itemId) => !rightFoundation.has(itemId));
}

export function assertPersistableRecommendationLooks(looks: CandidateLook[], ownerUserId: string) {
  for (const look of looks) {
    if (look.ownerUserId !== ownerUserId || look.items.some((item) => item.ownerUserId !== ownerUserId)) {
      throw new Error("Recommendation persistence owner mismatch");
    }
    if (!hasStructurallyCompleteFoundation(look.items)) {
      throw new Error("Recommendation persistence rejected an incomplete outfit");
    }
  }
  for (let index = 1; index < looks.length; index += 1) {
    if (!materiallyDistinctFoundations(looks[0]!, looks[index]!)) {
      throw new Error("Recommendation persistence rejected a support-only alternative");
    }
  }
}
