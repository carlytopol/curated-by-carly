import { requireCurrentUserId } from "@/lib/auth/require-current-user";
import { deleteShopperConversation, listShopperConversations, renameShopperConversation } from "@/lib/data/shopper-conversations";
import { isActiveShopperConversation } from "@/lib/personal-shopper/session";

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    const conversations = await listShopperConversations(userId);
    const active = conversations.find((conversation) => isActiveShopperConversation(conversation.updatedAt)) ?? null;
    return Response.json({ active, archived: conversations.filter((conversation) => conversation.id !== active?.id) });
  } catch (error) {
    console.error("Personal Shopper archive unavailable.", error);
    return Response.json({ error: "Your saved conversations could not be loaded." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    const title = typeof body.title === "string" ? body.title : "";
    if (!id || !title.trim()) return Response.json({ error: "Choose a conversation and add a name." }, { status: 400 });
    return Response.json({ title: await renameShopperConversation(userId, id, title) });
  } catch (error) {
    console.error("Personal Shopper rename unavailable.", error);
    return Response.json({ error: error instanceof Error ? error.message : "The conversation could not be renamed." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!id) return Response.json({ error: "Choose a conversation to delete." }, { status: 400 });
    await deleteShopperConversation(userId, id);
    return Response.json({ deleted: true });
  } catch (error) {
    console.error("Personal Shopper deletion unavailable.", error);
    return Response.json({ error: "The conversation could not be deleted." }, { status: 503 });
  }
}
