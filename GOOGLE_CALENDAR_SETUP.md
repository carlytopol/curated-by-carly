# Google Calendar Phase 1 Setup

This setup enables Curated's read-only Google Calendar connection. Curated requests only calendar-list and event read access, retrieves only the current local day, and never requests Gmail, Contacts, or calendar write access.

## Google Cloud Console

1. Create or select a dedicated Google Cloud project for the matching Curated environment.
2. Enable **Google Calendar API** under APIs & Services → Library.
3. Configure the OAuth consent screen:
   - application name: Curated;
   - authorized domain: the production Curated domain;
   - privacy-policy and terms URLs must be public and accurate;
   - use External audience if supporting ordinary Google accounts;
   - add development/test accounts while the app remains in testing.
4. Add exactly these scopes:
   - `https://www.googleapis.com/auth/calendar.events.readonly`
   - `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
5. Do not add `calendar`, `calendar.events`, Gmail, Contacts, profile, or email scopes.
6. Create an OAuth 2.0 Client ID of type **Web application**.
7. Add exact authorized redirect URIs:
   - local: `http://localhost:3000/api/calendar/callback/google`
   - production: `https://curated-by-carly.vercel.app/api/calendar/callback/google`
8. Copy the client ID and client secret into the corresponding Vercel environment only.
9. Complete Google's OAuth verification before making the connection broadly available in production. Calendar event scopes may require verification.

Do not register arbitrary Vercel preview URLs against the production Google OAuth client. Use an isolated preview project/client if preview OAuth is required.

## Supabase

1. Run `supabase/google-calendar-phase-1.sql` in the intended Supabase project.
2. Copy a modern Supabase **secret key** (`sb_secret_...`) from Project Settings → API Keys → Publishable and secret API keys into Vercel as `SUPABASE_SERVICE_ROLE_KEY`. The environment-variable name is retained for application compatibility, but its value should be the new secret key, not the legacy JWT `service_role` key. This server-only `supabase-js` client supports the new secret key and Supabase recommends it for backend code; legacy `service_role` keys are deprecated for new integrations and are scheduled for deprecation by the end of 2026.
3. Never prefix the service-role key with `NEXT_PUBLIC_` and never expose it to client code.

If the project has no secret key yet, create a dedicated backend secret key (for example, `calendar_backend`) rather than copying the legacy `service_role` key. Both key types bypass RLS, but modern secret keys add browser-use protection and can be rotated independently.

The migration intentionally gives authenticated users owner-scoped access to safe `calendar_connections` metadata and gives them no access to `calendar_credentials`. Token ciphertext is accessed only by the server-only service-role client after an ownership check.

## Encryption and identifier secrets

Generate independent random secrets for each environment. Example commands:

```bash
openssl rand -base64 32
openssl rand -base64 32
```

Use one output as `CALENDAR_TOKEN_ENCRYPTION_KEY_V1` and the other as `CALENDAR_IDENTIFIER_HMAC_KEY`. Store them in a password manager and Vercel environment variables. Losing the encryption key makes stored connections unusable; rotating it requires retaining the previous version until credentials are re-encrypted.

## Vercel environment variables

Set these for Production and for any explicitly supported isolated development/preview environment:

```text
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GOOGLE_CALENDAR_REDIRECT_URI=https://curated-by-carly.vercel.app/api/calendar/callback/google
CALENDAR_TOKEN_ENCRYPTION_KEY_V1=
CALENDAR_TOKEN_ENCRYPTION_ACTIVE_VERSION=1
CALENDAR_IDENTIFIER_HMAC_KEY=
```

Existing variables must also remain configured:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=https://curated-by-carly.vercel.app
```

Redeploy after adding or changing server environment variables.

## Verification checklist

- Disconnected state appears without exposing configuration values.
- Connect redirects to Google's consent screen with only the two read-only scopes.
- Callback returns to `/today?calendar=connected`.
- Today's events appear with title, time, location, provider, and calendar name only.
- All-day events remain all-day.
- No event descriptions, attendees, organizer, conference data, email, or contacts are returned.
- Expired/revoked refresh tokens produce the reconnect state.
- Disconnect attempts Google revocation and deletes local connection credentials regardless of revocation outcome.
- Browser network responses and JavaScript bundles contain no access or refresh tokens.
