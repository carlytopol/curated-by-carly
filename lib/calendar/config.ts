export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
] as const;

export function isGoogleCalendarConfigured() {
  return Boolean(
    process.env.GOOGLE_CALENDAR_CLIENT_ID
    && process.env.GOOGLE_CALENDAR_CLIENT_SECRET
    && process.env.GOOGLE_CALENDAR_REDIRECT_URI
    && process.env.SUPABASE_SERVICE_ROLE_KEY
    && process.env.CALENDAR_TOKEN_ENCRYPTION_KEY_V1
    && process.env.CALENDAR_IDENTIFIER_HMAC_KEY,
  );
}

export function getGoogleCalendarConfig() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) throw new Error("Google Calendar is not configured.");
  return { clientId, clientSecret, redirectUri };
}
