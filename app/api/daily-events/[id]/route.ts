import { requireCurrentUserId } from "@/lib/auth/require-current-user";
import { containsReservedEngineeringFixture } from "@/lib/daily-agenda/engineering-fixture-guard";
import { deleteDailyEvent, updateDailyEvent } from "@/lib/data/daily-events";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await deleteDailyEvent(await requireCurrentUserId(), id);
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Daily event delete failed.", error);
    return Response.json({ error: "We could not remove this event." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const input = await request.json();
    if (input.title !== undefined && (typeof input.title !== "string" || !input.title.trim())) return Response.json({ error: "Event title is required." }, { status: 400 });
    if ((typeof input.title === "string" && input.title.length > 200)
      || (typeof input.location === "string" && input.location.length > 500)
      || (typeof input.dressCode === "string" && input.dressCode.length > 300)
      || (typeof input.notes === "string" && input.notes.length > 3000)
      || (input.position !== undefined && (!Number.isInteger(input.position) || input.position < 0 || input.position > 100))) {
      return Response.json({ error: "One or more event details are too long or invalid." }, { status: 400 });
    }
    if (containsReservedEngineeringFixture(input)) {
      return Response.json({ error: "This verification record cannot be saved to a customer schedule." }, { status: 400 });
    }
    await updateDailyEvent(await requireCurrentUserId(), id, input);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Daily event update failed.", error);
    return Response.json({ error: "We could not update this event." }, { status: 500 });
  }
}
