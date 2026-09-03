export const SHOPPER_ACTIVE_WINDOW_MS = 4 * 60 * 60 * 1000;

export function isActiveShopperConversation(updatedAt: string, now = Date.now()) {
  const timestamp = new Date(updatedAt).getTime();
  return Number.isFinite(timestamp) && now - timestamp < SHOPPER_ACTIVE_WINDOW_MS;
}
