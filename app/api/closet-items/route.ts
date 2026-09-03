import { requireCurrentUserId } from "@/lib/auth/require-current-user";
import { createClothingItem, listClothingItems } from "@/lib/data/clothing-items";
import { validateCreateClothingItem } from "@/lib/validation/clothing-item";

export const runtime = "nodejs";

export async function GET() {
  try {
    const items = await listClothingItems(await requireCurrentUserId());
    return Response.json(items, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Unable to load closet items.", error);
    return Response.json(
      { error: "We could not load your collection. Please try again." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    const result = validateCreateClothingItem(body);

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    const item = await createClothingItem(await requireCurrentUserId(), result.data);
    return Response.json(item, { status: 201 });
  } catch (error) {
    console.error("Unable to create closet item.", error);
    return Response.json(
      { error: "We could not save this piece. Please try again." },
      { status: 500 },
    );
  }
}
