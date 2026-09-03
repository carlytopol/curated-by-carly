import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptCalendarSecret, encryptCalendarSecret, type EncryptedValue } from "./crypto";
import { getGoogleCalendarConfig } from "./config";
import { refreshGoogleAccessToken } from "./google";

export type CalendarConnectionStatus = "active" | "needs_reauth" | "invalid_link" | "unreachable_feed" | "error" | "disconnecting";
export type SafeCalendarConnection = {
  id: string;
  provider: "google" | "ics";
  displayLabel: string;
  status: CalendarConnectionStatus;
  lastSyncedAt: string | null;
};

type CredentialRow = {
  connection_id: string;
  encrypted_refresh_token: string | null;
  refresh_token_iv: string | null;
  refresh_token_tag: string | null;
  encrypted_access_token: string | null;
  access_token_iv: string | null;
  access_token_tag: string | null;
  access_token_expires_at: string | null;
  encrypted_subscription_url: string | null;
  subscription_url_iv: string | null;
  subscription_url_tag: string | null;
  key_version: number;
  token_version: number;
};

function connectionDto(row: Record<string, unknown>): SafeCalendarConnection {
  return {
    id: String(row.id),
    provider: row.provider === "ics" ? "ics" : "google",
    displayLabel: typeof row.display_label === "string" ? row.display_label : row.provider === "ics" ? "Apple Calendar" : "Google Calendar",
    status: (row.status as CalendarConnectionStatus) || "error",
    lastSyncedAt: typeof row.last_synced_at === "string" ? row.last_synced_at : null,
  };
}

export async function listCalendarConnections(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("calendar_connections").select("id,provider,display_label,status,last_synced_at").eq("user_id", userId).in("provider", ["google", "ics"]).order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => connectionDto(row));
}

export async function requireOwnedConnection(userId: string, connectionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("calendar_connections").select("id,provider,display_label,status,last_synced_at").eq("id", connectionId).eq("user_id", userId).in("provider", ["google", "ics"]).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("calendar_connection_not_found");
  return connectionDto(data);
}

export async function createGoogleCalendarConnection(input: { userId: string; refreshToken: string; accessToken: string; expiresAt: string; scopes: string[] }) {
  const connectionId = randomUUID();
  const refresh = encryptCalendarSecret(input.refreshToken, `google:${connectionId}:refresh`);
  const access = encryptCalendarSecret(input.accessToken, `google:${connectionId}:access`, refresh.keyVersion);
  // The callback verifies the authenticated user and OAuth transaction before
  // reaching this function. Use the server-only admin client for both writes so
  // credential persistence does not depend on forwarding the browser session
  // through a third-party OAuth redirect. Ownership remains explicit in user_id.
  const admin = createAdminClient();
  const { error: connectionError } = await admin.from("calendar_connections").insert({
    id: connectionId,
    user_id: input.userId,
    provider: "google",
    display_label: "Google Calendar",
    status: "active",
    granted_scopes: input.scopes,
    updated_at: new Date().toISOString(),
  });
  if (connectionError) throw connectionError;
  try {
    const { error } = await admin.from("calendar_credentials").insert({
      connection_id: connectionId,
      encrypted_refresh_token: refresh.ciphertext,
      refresh_token_iv: refresh.iv,
      refresh_token_tag: refresh.tag,
      encrypted_access_token: access.ciphertext,
      access_token_iv: access.iv,
      access_token_tag: access.tag,
      access_token_expires_at: input.expiresAt,
      key_version: refresh.keyVersion,
      token_version: 1,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  } catch (error) {
    await admin.from("calendar_connections").delete().eq("id", connectionId).eq("user_id", input.userId);
    throw error;
  }
  return connectionId;
}

async function credential(connectionId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("calendar_credentials").select("connection_id,encrypted_refresh_token,refresh_token_iv,refresh_token_tag,encrypted_access_token,access_token_iv,access_token_tag,access_token_expires_at,encrypted_subscription_url,subscription_url_iv,subscription_url_tag,key_version,token_version").eq("connection_id", connectionId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("calendar_credentials_missing");
  return data as CredentialRow;
}

function encrypted(row: CredentialRow, type: "refresh" | "access"): EncryptedValue {
  const ciphertext = type === "refresh" ? row.encrypted_refresh_token : row.encrypted_access_token;
  const iv = type === "refresh" ? row.refresh_token_iv : row.access_token_iv;
  const tag = type === "refresh" ? row.refresh_token_tag : row.access_token_tag;
  if (!ciphertext || !iv || !tag) throw new Error("calendar_credentials_missing");
  return { ciphertext, iv, tag, keyVersion: row.key_version };
}

export async function getGoogleAccessToken(userId: string, connectionId: string) {
  const connection = await requireOwnedConnection(userId, connectionId);
  if (connection.provider !== "google" || connection.status !== "active") throw new Error("calendar_connection_expired");
  const row = await credential(connectionId);
  const expiry = row.access_token_expires_at ? new Date(row.access_token_expires_at).getTime() : 0;
  if (row.encrypted_access_token && expiry > Date.now() + 5 * 60 * 1000) {
    return decryptCalendarSecret(encrypted(row, "access"), `google:${connectionId}:access`);
  }
  const refreshToken = decryptCalendarSecret(encrypted(row, "refresh"), `google:${connectionId}:refresh`);
  try {
    const config = getGoogleCalendarConfig();
    const refreshed = await refreshGoogleAccessToken({ refreshToken, clientId: config.clientId, clientSecret: config.clientSecret });
    const access = encryptCalendarSecret(refreshed.access_token, `google:${connectionId}:access`, row.key_version);
    const expiresAt = new Date(Date.now() + Math.max(60, refreshed.expires_in) * 1000).toISOString();
    const admin = createAdminClient();
    const { error } = await admin.from("calendar_credentials").update({
      encrypted_access_token: access.ciphertext,
      access_token_iv: access.iv,
      access_token_tag: access.tag,
      access_token_expires_at: expiresAt,
      token_version: row.token_version + 1,
      updated_at: new Date().toISOString(),
    }).eq("connection_id", connectionId).eq("token_version", row.token_version);
    if (error) throw error;
    return refreshed.access_token;
  } catch (error) {
    if (error instanceof Error && error.message === "google_invalid_grant") {
      const supabase = await createClient();
      await supabase.from("calendar_connections").update({ status: "needs_reauth", last_error_code: "refresh_revoked", updated_at: new Date().toISOString() }).eq("id", connectionId).eq("user_id", userId);
    }
    throw error;
  }
}

export async function getGoogleRefreshToken(userId: string, connectionId: string) {
  const connection = await requireOwnedConnection(userId, connectionId);
  if (connection.provider !== "google") throw new Error("calendar_connection_provider_mismatch");
  const row = await credential(connectionId);
  return decryptCalendarSecret(encrypted(row, "refresh"), `google:${connectionId}:refresh`);
}

export async function markCalendarSynced(userId: string, connectionId: string) {
  const supabase = await createClient();
  await supabase.from("calendar_connections").update({ status: "active", last_synced_at: new Date().toISOString(), last_error_code: null, updated_at: new Date().toISOString() }).eq("id", connectionId).eq("user_id", userId);
}

function subscriptionEncrypted(row: CredentialRow): EncryptedValue {
  if (!row.encrypted_subscription_url || !row.subscription_url_iv || !row.subscription_url_tag) throw new Error("calendar_subscription_missing");
  return { ciphertext: row.encrypted_subscription_url, iv: row.subscription_url_iv, tag: row.subscription_url_tag, keyVersion: row.key_version };
}

export async function createIcsCalendarConnection(input: { userId: string; subscriptionUrl: string; displayLabel: string }) {
  const connectionId = randomUUID();
  const url = encryptCalendarSecret(input.subscriptionUrl, `ics:${connectionId}:subscription-url`);
  const hmacKey = process.env.CALENDAR_IDENTIFIER_HMAC_KEY;
  if (!hmacKey) throw new Error("calendar_identifier_key_missing");
  const providerHash = createHmac("sha256", hmacKey).update(input.subscriptionUrl).digest("base64url");
  const admin = createAdminClient();
  const { error: connectionError } = await admin.from("calendar_connections").insert({
    id: connectionId, user_id: input.userId, provider: "ics", provider_account_hash: providerHash,
    display_label: input.displayLabel.slice(0, 120) || "Apple Calendar", status: "active", granted_scopes: [], updated_at: new Date().toISOString(),
  });
  if (connectionError) throw connectionError;
  const { error: credentialError } = await admin.from("calendar_credentials").insert({
    connection_id: connectionId, encrypted_subscription_url: url.ciphertext, subscription_url_iv: url.iv,
    subscription_url_tag: url.tag, key_version: url.keyVersion, token_version: 1, updated_at: new Date().toISOString(),
  });
  if (credentialError) {
    await admin.from("calendar_connections").delete().eq("id", connectionId).eq("user_id", input.userId);
    throw credentialError;
  }
  return connectionId;
}

export async function replaceIcsCalendarConnection(input: { userId: string; connectionId: string; subscriptionUrl: string; displayLabel: string }) {
  const connection = await requireOwnedConnection(input.userId, input.connectionId);
  if (connection.provider !== "ics") throw new Error("calendar_connection_provider_mismatch");
  const current = await credential(input.connectionId);
  const url = encryptCalendarSecret(input.subscriptionUrl, `ics:${input.connectionId}:subscription-url`, current.key_version);
  const hmacKey = process.env.CALENDAR_IDENTIFIER_HMAC_KEY;
  if (!hmacKey) throw new Error("calendar_identifier_key_missing");
  const providerHash = createHmac("sha256", hmacKey).update(input.subscriptionUrl).digest("base64url");
  const admin = createAdminClient();
  const { error: credentialError } = await admin.from("calendar_credentials").update({
    encrypted_subscription_url: url.ciphertext, subscription_url_iv: url.iv, subscription_url_tag: url.tag,
    token_version: current.token_version + 1, updated_at: new Date().toISOString(),
  }).eq("connection_id", input.connectionId).eq("token_version", current.token_version);
  if (credentialError) throw credentialError;
  const { error: connectionError } = await admin.from("calendar_connections").update({
    provider_account_hash: providerHash, display_label: input.displayLabel.slice(0, 120) || "Apple Calendar",
    status: "active", last_error_code: null, updated_at: new Date().toISOString(),
  }).eq("id", input.connectionId).eq("user_id", input.userId).eq("provider", "ics");
  if (connectionError) throw connectionError;
}

export async function getIcsSubscriptionUrl(userId: string, connectionId: string) {
  const connection = await requireOwnedConnection(userId, connectionId);
  if (connection.provider !== "ics") throw new Error("calendar_connection_provider_mismatch");
  const row = await credential(connectionId);
  return decryptCalendarSecret(subscriptionEncrypted(row), `ics:${connectionId}:subscription-url`);
}

export async function markCalendarConnectionError(userId: string, connectionId: string, status: "invalid_link" | "unreachable_feed" | "error", code: string) {
  const admin = createAdminClient();
  await admin.from("calendar_connections").update({ status, last_error_code: code.slice(0, 80), updated_at: new Date().toISOString() }).eq("id", connectionId).eq("user_id", userId);
}

export async function deleteCalendarConnection(userId: string, connectionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("calendar_connections").delete().eq("id", connectionId).eq("user_id", userId).select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("calendar_connection_not_found");
}
