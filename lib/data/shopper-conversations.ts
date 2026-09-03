import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { isActiveShopperConversation } from "@/lib/personal-shopper/session";
import { PRIVATE_MEDIA_BUCKET, signPrivateImage } from "@/lib/media/private-storage";

export type ShopperMessageRecord = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  imageUrls: string[];
  productUrl: string | null;
};

export type ShopperConversationRecord = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ShopperMessageRecord[];
};

type MessageRow = { id: string; role: string; content: string; created_at: string; image_path?: string | null; product_url?: string | null };
type ConversationRow = {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  shopper_messages?: MessageRow[] | null;
};

function defaultTitle(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "Product consultation";
  return normalized.length > 72 ? `${normalized.slice(0, 69).trimEnd()}…` : normalized;
}

function imagePaths(value: string | null | undefined) {
  if (!value) return [];
  if (!value.startsWith("[")) return [value];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((path): path is string => typeof path === "string" && path.length > 0).slice(0, 2) : [];
  } catch { return []; }
}

function toRecord(row: ConversationRow): ShopperConversationRecord {
  return {
    id: row.id,
    title: row.title || "Personal Shopper conversation",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messages: (row.shopper_messages ?? []).map((message) => ({
      id: message.id,
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
      createdAt: message.created_at,
      imageUrls: [],
      productUrl: message.product_url ?? null,
    })),
  };
}

async function toRecordWithImages(row: ConversationRow) {
  const record = toRecord(row);
  record.messages = await Promise.all(record.messages.map(async (message, index) => ({
    ...message,
    imageUrls: (await Promise.all(imagePaths(row.shopper_messages?.[index]?.image_path).map((path) => signPrivateImage(path, 6 * 60 * 60)))).filter((url): url is string => Boolean(url)),
  })));
  return record;
}

export async function listShopperConversations(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shopper_conversations")
    .select("id,title,created_at,updated_at,shopper_messages(id,role,content,created_at,image_path,product_url)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .order("created_at", { referencedTable: "shopper_messages", ascending: true });
  if (error) throw new Error(`Personal Shopper archive query failed: ${error.message}`);
  const records = await Promise.all(((data ?? []) as ConversationRow[]).map(toRecordWithImages));
  return records.filter((conversation) => !conversation.title.startsWith("Travel · "));
}

export async function listTravelConversations(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shopper_conversations")
    .select("id,title,created_at,updated_at,shopper_messages(id,role,content,created_at,image_path,product_url)")
    .eq("user_id", userId)
    .like("title", "Travel · %")
    .order("updated_at", { ascending: false })
    .order("created_at", { referencedTable: "shopper_messages", ascending: true });
  if (error) throw new Error(`Travel archive query failed: ${error.message}`);
  return (await Promise.all(((data ?? []) as ConversationRow[]).map(toRecordWithImages))).map((conversation) => ({
    ...conversation,
    title: conversation.title.replace(/^Travel · /, ""),
  }));
}

export async function getActiveTravelConversation(userId: string, conversationId?: string) {
  const conversations = await listTravelConversations(userId);
  const conversation = conversationId
    ? conversations.find((item) => item.id === conversationId)
    : conversations[0];
  return conversation && isActiveShopperConversation(conversation.updatedAt) ? conversation : null;
}

export async function getTravelConversationState(userId: string, conversationId: string) {
  const conversations = await listTravelConversations(userId);
  const conversation = conversations.find((item) => item.id === conversationId);
  if (!conversation) return { state: "unavailable" as const, conversation: null };
  if (!isActiveShopperConversation(conversation.updatedAt)) {
    return { state: "expired" as const, conversation };
  }
  return { state: "active" as const, conversation };
}

export async function createTravelConversation(userId: string, destination: string) {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const cleanDestination = destination.replace(/\s+/g, " ").trim().slice(0, 82) || "Travel consultation";
  const row = { id: randomUUID(), user_id: userId, title: `Travel · ${cleanDestination}`, updated_at: now };
  const { data, error } = await supabase.from("shopper_conversations").insert(row).select("id,title,created_at,updated_at").single();
  if (error) throw new Error(`Travel conversation save failed: ${error.message}`);
  const record = toRecord(data as ConversationRow);
  return { ...record, title: record.title.replace(/^Travel · /, "") };
}

export async function renameTravelConversation(userId: string, conversationId: string, title: string) {
  const cleanTitle = title.replace(/\s+/g, " ").trim().slice(0, 82);
  if (!cleanTitle) throw new Error("Add a conversation name.");
  const supabase = await createClient();
  const { error } = await supabase.from("shopper_conversations").update({ title: `Travel · ${cleanTitle}` }).eq("id", conversationId).eq("user_id", userId);
  if (error) throw new Error(`Travel rename failed: ${error.message}`);
  return cleanTitle;
}

export async function getActiveShopperConversation(userId: string, conversationId?: string) {
  const conversations = await listShopperConversations(userId);
  const conversation = conversationId
    ? conversations.find((item) => item.id === conversationId)
    : conversations[0];
  return conversation && isActiveShopperConversation(conversation.updatedAt) ? conversation : null;
}

export async function createShopperConversation(userId: string, firstMessage: string) {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const row = { id: randomUUID(), user_id: userId, title: defaultTitle(firstMessage), updated_at: now };
  const { data, error } = await supabase.from("shopper_conversations").insert(row).select("id,title,created_at,updated_at").single();
  if (error) throw new Error(`Personal Shopper conversation save failed: ${error.message}`);
  return toRecord(data as ConversationRow);
}

export async function addShopperMessage(userId: string, conversationId: string, role: "user" | "assistant", content: string, options: { imagePaths?: string[]; productUrl?: string | null; messageId?: string } = {}) {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const messageId = options.messageId ?? randomUUID();
  const { error } = await supabase.from("shopper_messages").insert({
    id: messageId, user_id: userId, conversation_id: conversationId, role, content, created_at: now,
    image_path: options.imagePaths?.length ? JSON.stringify(options.imagePaths.slice(0, 2)) : null,
    product_url: options.productUrl ?? null,
  });
  if (error?.code === "23505" && options.messageId) {
    const { data: existing, error: existingError } = await supabase
      .from("shopper_messages")
      .select("id,role,content")
      .eq("id", messageId)
      .eq("user_id", userId)
      .eq("conversation_id", conversationId)
      .maybeSingle();
    if (existingError || !existing || existing.role !== role || existing.content !== content) {
      throw new Error("Personal Shopper message retry could not be verified.");
    }
  } else if (error) {
    throw new Error(`Personal Shopper message save failed: ${error.message}`);
  }
  const { error: updateError } = await supabase.from("shopper_conversations").update({ updated_at: now }).eq("id", conversationId).eq("user_id", userId);
  if (updateError) throw new Error(`Personal Shopper timestamp update failed: ${updateError.message}`);
  return messageId;
}

export async function renameShopperConversation(userId: string, conversationId: string, title: string) {
  const supabase = await createClient();
  const cleanTitle = title.replace(/\s+/g, " ").trim().slice(0, 100);
  if (!cleanTitle) throw new Error("Add a conversation name.");
  const { error } = await supabase.from("shopper_conversations").update({ title: cleanTitle }).eq("id", conversationId).eq("user_id", userId);
  if (error) throw new Error(`Personal Shopper rename failed: ${error.message}`);
  return cleanTitle;
}

export async function deleteShopperConversation(userId: string, conversationId: string) {
  const supabase = await createClient();
  const { data: messages } = await supabase.from("shopper_messages").select("image_path").eq("conversation_id", conversationId).eq("user_id", userId);
  const paths = (messages ?? []).flatMap((message) => imagePaths(message.image_path));
  if (paths.length) await supabase.storage.from(PRIVATE_MEDIA_BUCKET).remove(paths);
  const { error } = await supabase.from("shopper_conversations").delete().eq("id", conversationId).eq("user_id", userId);
  if (error) throw new Error(`Personal Shopper deletion failed: ${error.message}`);
}
