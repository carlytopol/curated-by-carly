import { requireCurrentUserId } from "@/lib/auth/require-current-user";
import { containsReservedEngineeringFixture } from "@/lib/daily-agenda/engineering-fixture-guard";
import { createDailyEvent, listDailyEvents } from "@/lib/data/daily-events";
import type { CreateDailyEventInput } from "@/types/daily-event";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function validEventText(input: CreateDailyEventInput) {
  return input.title.trim().length <= 200
    && (input.location?.length ?? 0) <= 500
    && (input.dressCode?.length ?? 0) <= 300
    && (input.notes?.length ?? 0) <= 3000;
}

export async function GET(request: Request) {
  try {
    const date = new URL(request.url).searchParams.get("date") || new Date().toISOString().slice(0, 10);
    if (!datePattern.test(date)) return Response.json({ error: "Invalid date." }, { status: 400 });
    return Response.json(await listDailyEvents(await requireCurrentUserId(), date));
  } catch (error) {
    console.error("Daily event list failed.", error);
    return Response.json({ error: "We could not open your schedule." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const input = await request.json() as CreateDailyEventInput;
    if (!input || !datePattern.test(input.eventDate) || typeof input.title !== "string" || !input.title.trim() || !validEventText(input)) {
      return Response.json({ error: "Add an event title and valid date." }, { status: 400 });
    }
    if (containsReservedEngineeringFixture(input as unknown as Record<string, unknown>)) {
      return Response.json({ error: "This verification record cannot be saved to a customer schedule." }, { status: 400 });
    }
    return Response.json(await createDailyEvent(await requireCurrentUserId(), input), { status: 201 });
  } catch (error) {
    console.error("Daily event save failed.", error);
    return Response.json({ error: "We could not save this event." }, { status: 500 });
  }
}
