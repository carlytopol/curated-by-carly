import { requireCurrentUserId } from "@/lib/auth/require-current-user";
import { deleteCalendarConnection, getGoogleRefreshToken, requireOwnedConnection } from "@/lib/calendar/connections";
import { disconnectBehaviorForProvider } from "@/lib/calendar/ics";
import { revokeGoogleToken } from "@/lib/calendar/google";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireCurrentUserId();
    enforceRateLimit(userId, "calendar-disconnect", { limit: 10, windowMs: 10 * 60 * 1000 });
    const { id } = await context.params;
    const connection = await requireOwnedConnection(userId, id);
    const behavior = disconnectBehaviorForProvider(connection.provider);
    if (behavior.revokeRemoteToken) {
      try { await revokeGoogleToken(await getGoogleRefreshToken(userId, id)); } catch { /* Local deletion must still succeed. */ }
    }
    await deleteCalendarConnection(userId, id);
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "We could not disconnect this calendar." }, { status: 500 });
  }
}
