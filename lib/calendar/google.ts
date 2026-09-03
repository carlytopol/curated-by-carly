import { createHash, createHmac, randomBytes } from "node:crypto";
import type { CalendarEvent } from "@/types/calendar";
import { GOOGLE_CALENDAR_SCOPES } from "./config";

export type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

export type GoogleCalendarListEntry = { id?: string; summary?: string; primary?: boolean; accessRole?: string };
export type GoogleEventRecord = {
  id?: string;
  summary?: string;
  location?: string;
  status?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};

type Fetcher = typeof fetch;

export function createPkcePair() {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function createGoogleAuthorizationUrl(input: { clientId: string; redirectUri: string; state: string; challenge: string }) {
  const parameters = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: GOOGLE_CALENDAR_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "false",
    state: input.state,
    code_challenge: input.challenge,
    code_challenge_method: "S256",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${parameters}`;
}

async function tokenRequest(parameters: URLSearchParams, fetcher: Fetcher) {
  const response = await fetcher("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: parameters,
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const error = new Error(response.status === 400 ? "google_invalid_grant" : "google_token_error");
    error.name = "GoogleTokenError";
    throw error;
  }
  return await response.json() as GoogleTokenResponse;
}

export function exchangeGoogleAuthorizationCode(input: { code: string; verifier: string; clientId: string; clientSecret: string; redirectUri: string }, fetcher: Fetcher = fetch) {
  return tokenRequest(new URLSearchParams({
    code: input.code,
    code_verifier: input.verifier,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    redirect_uri: input.redirectUri,
    grant_type: "authorization_code",
  }), fetcher);
}

export function refreshGoogleAccessToken(input: { refreshToken: string; clientId: string; clientSecret: string }, fetcher: Fetcher = fetch) {
  return tokenRequest(new URLSearchParams({
    refresh_token: input.refreshToken,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    grant_type: "refresh_token",
  }), fetcher);
}

export function scopesAreExact(scope: string | undefined) {
  if (!scope) return false;
  const actual = new Set(scope.split(/\s+/).filter(Boolean));
  return actual.size === GOOGLE_CALENDAR_SCOPES.length && GOOGLE_CALENDAR_SCOPES.every((item) => actual.has(item));
}

export function normalizeGoogleEvent(input: { event: GoogleEventRecord; calendarId: string; calendarName: string; hmacKey: string }): CalendarEvent | null {
  const { event } = input;
  if (!event.id || event.status === "cancelled") return null;
  const startTime = event.start?.dateTime || event.start?.date;
  const endTime = event.end?.dateTime || event.end?.date;
  if (!startTime || !endTime) return null;
  const id = createHmac("sha256", input.hmacKey).update(`${input.calendarId}\0${event.id}\0${startTime}`).digest("base64url");
  return {
    id,
    title: event.summary?.trim() || "Busy",
    startTime,
    endTime,
    location: event.location?.trim() || null,
    provider: "google",
    calendarName: input.calendarName.trim() || "Google Calendar",
    isAllDay: Boolean(event.start?.date && !event.start?.dateTime),
  };
}

async function googleJson<T>(url: string, accessToken: string, fetcher: Fetcher) {
  const response = await fetcher(url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(response.status === 401 ? "google_unauthorized" : "google_calendar_error");
  return await response.json() as T;
}

export async function listGoogleCalendars(accessToken: string, fetcher: Fetcher = fetch) {
  const result: GoogleCalendarListEntry[] = [];
  let pageToken = "";
  do {
    const query = new URLSearchParams({ maxResults: "250", fields: "items(id,summary,primary,accessRole),nextPageToken" });
    if (pageToken) query.set("pageToken", pageToken);
    const body = await googleJson<{ items?: GoogleCalendarListEntry[]; nextPageToken?: string }>(`https://www.googleapis.com/calendar/v3/users/me/calendarList?${query}`, accessToken, fetcher);
    result.push(...(body.items ?? []).filter((item) => item.id && item.accessRole !== "freeBusyReader"));
    pageToken = body.nextPageToken || "";
  } while (pageToken && result.length < 500);
  return result.slice(0, 500);
}

export async function listGoogleEventsForDay(input: { accessToken: string; calendarId: string; calendarName: string; timeMin: string; timeMax: string; hmacKey: string }, fetcher: Fetcher = fetch) {
  const normalized: CalendarEvent[] = [];
  let pageToken = "";
  do {
    const query = new URLSearchParams({
      timeMin: input.timeMin,
      timeMax: input.timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
      fields: "items(id,status,summary,location,start(date,dateTime),end(date,dateTime)),nextPageToken",
    });
    if (pageToken) query.set("pageToken", pageToken);
    const body = await googleJson<{ items?: GoogleEventRecord[]; nextPageToken?: string }>(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events?${query}`, input.accessToken, fetcher);
    for (const event of body.items ?? []) {
      const mapped = normalizeGoogleEvent({ event, calendarId: input.calendarId, calendarName: input.calendarName, hmacKey: input.hmacKey });
      if (mapped) normalized.push(mapped);
    }
    pageToken = body.nextPageToken || "";
  } while (pageToken && normalized.length < 1000);
  return normalized.slice(0, 1000);
}

export async function revokeGoogleToken(token: string, fetcher: Fetcher = fetch) {
  await fetcher(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal: AbortSignal.timeout(5000) }).catch(() => undefined);
}
