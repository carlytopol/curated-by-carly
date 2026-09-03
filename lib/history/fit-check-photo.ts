const SAFE_PATH_PART = /^[a-zA-Z0-9_-]+$/;
const SAFE_EXTENSION = /^(?:jpe?g|png|webp)$/i;

export function buildFitCheckStoragePath({
  userId,
  recommendationId,
  assetId,
  extension,
}: {
  userId: string;
  recommendationId: string;
  assetId: string;
  extension: string;
}) {
  if (![userId, recommendationId, assetId].every((value) => SAFE_PATH_PART.test(value))) {
    throw new Error("Invalid fit-check storage identifier.");
  }
  if (!SAFE_EXTENSION.test(extension)) throw new Error("Invalid fit-check image extension.");
  const normalizedExtension = extension.toLowerCase() === "jpeg" ? "jpg" : extension.toLowerCase();
  return `${userId}/fit-checks/${recommendationId}/${assetId}.${normalizedExtension}`;
}

export function historyCoverPath(fitCheckPath: unknown) {
  return typeof fitCheckPath === "string" && fitCheckPath.trim() ? fitCheckPath.trim() : null;
}
