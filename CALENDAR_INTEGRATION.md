# Calendar Integration Technical Implementation Plan

> **V2 authority notice — July 29, 2026:** The provider-neutral `DailyAgenda` boundary remains authoritative for calendar ingestion. Calendar providers populate agenda evidence; they do not select garments or bypass `RECOMMENDATION_ARCHITECTURE_V2.md`.

## Status and scope

This document is an implementation plan only. It does not add database tables, provider credentials, OAuth routes, calendar synchronization, or user-interface behavior.

The product goal is to let an authenticated Curated user connect one or more read-only calendars and use only today's minimal event context to populate an internal Daily Agenda. Dress My Day and the AI stylist consume Daily Agenda, never provider events or provider APIs directly. Delivery is phased:

1. Google Calendar.
2. Microsoft Outlook / Microsoft 365 Calendar.
3. Apple Calendar through a read-only iCal/ICS subscription URL.

The integration must never request calendar write access, email access, contacts access, or expose provider tokens to browser code.

## Repository and architecture assessment

### Current application

- Next.js 16 App Router application hosted on Vercel.
- Supabase provides password authentication, email confirmation, PostgreSQL, Row Level Security, and private Storage.
- Server identity is resolved from Supabase cookie-backed claims through `requireCurrentUserId()`.
- `proxy.ts` refreshes the Supabase session, rejects untrusted cross-site mutations, redirects protected pages, and returns `401` for unauthenticated API calls.
- Application data access is server-side and constrained by `user_id`; authenticated Supabase RLS policies provide a second ownership boundary.
- Prisma describes the application schema and generates types, while current production reads and writes use authenticated Supabase APIs.
- There is no service-role Supabase client, token-encryption service, calendar provider abstraction, job queue, or Vercel cron configuration today.

### Current Dress My Day flow

- `TodayWorkspace` is a client component.
- It loads manual events from `GET /api/daily-events?date=YYYY-MM-DD`.
- Manual events are persisted in `daily_events` and can be created, reordered, edited, or deleted.
- A recommendation is generated through `POST /api/daily-events/[id]/recommendations`.
- That route loads one owned event, wardrobe records, profile context, recent outfit history, and browser-supplied weather; OpenAI remains server-only.
- `outfit_recommendations.daily_event_id` currently requires a durable manual event.
- Calendar-derived events must not be inserted into the editable manual-event workflow merely to reuse this endpoint.
- There is no internal agenda boundary today. The implementation must introduce it before calendar events reach Dress My Day.

### Relevant planning-document decisions

- `DATABASE_PLAN.md` calls for provider-neutral calendar connections, encrypted refresh tokens, minimal selectively cached events, scheduled server-side synchronization, and compact recommendation context rather than raw provider history.
- `USER_PROFILE_SYSTEM.md` requires explicit consent, server-only provider credentials, disconnect/reset/delete controls, and graceful behavior without connected calendars.
- `PERSONAL_SHOPPER.md` anticipates calendar context as a future optional input but does not make Personal Shopper part of the first calendar milestone.
- `ARCHITECTURE.md` favors typed feature modules, server/data boundaries, local UI state, and independence between Dress My Day, profiles, and provider-specific code.

## Design principles

1. **Read only by construction.** Provider scopes and code paths must not include create, update, delete, RSVP, sharing, mail, or contact capabilities.
2. **Minimum event data.** Normalize and return only title, start, end, location, provider, and calendar name. Do not retrieve or retain descriptions, attendees, organizer details, conferencing links, attachments, recurrence rules beyond what is needed to expand today's instances, or email addresses.
3. **Tokens never reach the browser.** OAuth code exchange, refresh, revocation, calendar listing, and event retrieval run in Node.js route handlers or server services.
4. **Secrets are not owner-readable rows.** Safe connection metadata and encrypted credentials are separated. Credential tables have RLS enabled with no browser/user policy and are accessed only through a server-only administrative database client after an explicit ownership check.
5. **No permanent full history.** Fetch a narrow time window and keep, at most, a short-lived cache of minimal normalized events. Persist a minimal event snapshot only when the user requests or accepts a styling recommendation.
6. **Daily Agenda is the product boundary.** Providers produce normalized `CalendarEvent` values; only the Daily Agenda builder consumes them. Dress My Day, recommendations, weather coordination, travel, reservations, reminders, and future integrations consume `DailyAgenda`.
7. **Manual events remain independent at ingestion.** Existing `daily_events` remain editable. They are projected into Daily Agenda beside read-only provider events without losing their ownership or edit behavior.
8. **Failure is graceful.** An expired connection must not block manual Dress My Day, weather, wardrobe browsing, or existing recommendations.

## Domain model and architectural boundary

```text
Google / Microsoft / ICS
          ↓  read-only provider adapters
     CalendarEvent
          ↓  Daily Agenda builder + deduplication + enrichment
 DailyAgenda + DailyAgendaItem
          ↓
 Dress My Day · AI stylist · weather · travel · reservations · reminders
```

No consumer below Daily Agenda may import a calendar provider adapter, decrypt provider credentials, refresh tokens, or depend on provider-specific identifiers.

### Calendar ingestion type

Add `types/calendar.ts`:

```ts
export type CalendarProvider = "google" | "microsoft" | "ics";

export type CalendarEvent = {
  id: string; // Curated-generated opaque event reference; never a raw provider ID.
  title: string;
  startTime: string;
  endTime: string;
  location: string | null;
  provider: CalendarProvider;
  calendarName: string;
  isAllDay: boolean;
};
```

Rules:

- ISO 8601 timestamps always include an offset or `Z`.
- The user's IANA profile timezone defines the requested local day; do not calculate “today” from Vercel's server timezone.
- All-day events preserve `isAllDay=true`; their provider date boundaries are interpreted in the user's agenda timezone rather than converted into misleading midnight appointments.
- `id` is an opaque HMAC reference or random cache ID. Raw provider event IDs and calendar IDs are server-only.
- Provider adapters must explicitly project allowed fields rather than spreading provider responses.
- Empty and provider-generated titles normalize to a discreet fallback such as `Busy` only when a provider returns no usable title.

`CalendarEvent` is an ingestion DTO, not a Dress My Day API response and not the AI stylist's input.

### Daily Agenda types

Add `types/daily-agenda.ts`:

```ts
export type AgendaItemKind =
  | "meeting"
  | "dinner"
  | "travel"
  | "flight"
  | "workout"
  | "social"
  | "wedding"
  | "vacation"
  | "appointment"
  | "other";

export type AgendaItemSource =
  | "manual"
  | "calendar"
  | "travel"
  | "reservation"
  | "reminder";

export type DailyAgendaItem = {
  id: string;
  source: AgendaItemSource;
  kind: AgendaItemKind;
  title: string;
  startTime: string | null;
  endTime: string | null;
  isAllDay: boolean;
  location: string | null;
  occasion: string | null;
  inferredDressCode: string | null;
  inferenceConfidence: "low" | "medium" | "high";
  provider: CalendarProvider | null;
  calendarName: string | null;
  isReadOnly: boolean;
};

export type DailyAgenda = {
  id: string;
  date: string;
  timezone: string;
  items: DailyAgendaItem[];
  weatherContext: {
    summary: string;
    temperature: number | null;
    precipitationChance: number | null;
    location: string | null;
    fetchedAt: string;
  } | null;
  generatedAt: string;
};
```

Daily Agenda is a user-owned, date-scoped internal model. It is provider-independent and can exist with no connected calendar. It combines:

- editable manual `daily_events`;
- read-only normalized calendar events;
- future travel itinerary segments;
- flight records;
- restaurant or event reservations;
- user reminders that affect dress or timing;
- weather context resolved for relevant agenda locations.

### CalendarEvent → DailyAgenda mapping

| `CalendarEvent` | `DailyAgendaItem` | Rule |
| --- | --- | --- |
| opaque `id` | internal `source_ref_hash` then agenda item `id` | Raw provider IDs never cross the ingestion boundary. |
| `title` | `title` | Trim, length-limit, and treat as untrusted text. |
| `startTime` / `endTime` | same | Convert into agenda timezone while retaining absolute instants. |
| `isAllDay` | `isAllDay` | All-day items sort before timed items and remain all-day. |
| `location` | `location` | Normalize whitespace only; never geocode or infer sensitive detail automatically. |
| provider/calendar name | provider/calendar name | Retained only for source disclosure and disconnect behavior. |
| calendar origin | `source="calendar"`, `isReadOnly=true` | Prevents edit/delete/write controls. |
| title/time/location signals | `kind`, `occasion`, `inferredDressCode`, confidence | Produced by enrichment, never copied from provider-specific fields. |

Mapping is idempotent by user, local date, source, hashed external event instance, and start time. Calendar updates replace the corresponding agenda projection; disconnect removes calendar-derived items without affecting manual, travel, reservation, or reminder items.

### Required agenda item support

- **Meetings:** timed professional or personal meetings; may infer business, smart casual, presentation, or video-call context.
- **Dinners:** restaurant, client, formal, or social dinners; time and venue may affect formality.
- **Travel:** transfers, train journeys, road travel, and general travel days.
- **Flights:** departure/arrival times, airport context, duration, and travel-day layering needs.
- **Workouts:** gym, class, run, tennis, yoga, or other activity; should prioritize activewear and transitions.
- **Social events:** parties, drinks, birthdays, cultural events, and informal gatherings.
- **Weddings:** ceremony/reception context; never infer guest role or dress requirements beyond available text with appropriate confidence.
- **Vacations:** all-day or multi-day leisure context projected into each relevant daily agenda without storing a duplicate provider history.
- **All-day events:** remain untimed, influence the full day, and coexist with timed items.

Unknown or ambiguous items use `kind="other"` and low confidence rather than forcing a category.

## Database schema changes

Schema changes must be added to `prisma/schema.prisma`, committed as idempotent Supabase SQL, and protected with RLS.

### `calendar_connections`

Safe metadata for a connected account or subscription.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID PK | Random connection ID. |
| `user_id` | UUID FK | References the authenticated user; indexed. |
| `provider` | text | Check: `google`, `microsoft`, `ics`. |
| `provider_account_hash` | text nullable | HMAC of a stable provider account identifier; never store the email/account ID itself. |
| `display_label` | text | User-editable safe label such as “Google Calendar” or “Family iCal.” |
| `status` | text | `active`, `needs_reauth`, `error`, `disconnecting`. |
| `granted_scopes` | text[] | Exact audited scopes returned by provider. |
| `last_synced_at` | timestamptz nullable | Operational status only. |
| `last_error_code` | text nullable | Sanitized code; never provider payload/token. |
| `created_at`, `updated_at` | timestamptz | Standard timestamps. |

Constraints and indexes:

- Unique `(user_id, provider, provider_account_hash)` when the hash is present.
- Index `(user_id, status)`.
- Owner RLS for safe metadata only.

### `calendar_credentials`

Server-only secret material, one row per connection.

| Column | Type | Notes |
| --- | --- | --- |
| `connection_id` | UUID PK/FK | Cascades on connection deletion. |
| `encrypted_refresh_token` | bytea/text nullable | AES-256-GCM ciphertext. |
| `refresh_token_iv` | bytea/text nullable | Unique nonce. |
| `refresh_token_tag` | bytea/text nullable | Authentication tag. |
| `encrypted_access_token` | bytea/text nullable | Encrypt too if access tokens are cached. |
| `access_token_iv`, `access_token_tag` | bytea/text nullable | Authenticated encryption metadata. |
| `access_token_expires_at` | timestamptz nullable | Refresh threshold input. |
| `encrypted_subscription_url` | bytea/text nullable | Phase 3 ICS URL; treat it as a bearer credential. |
| `subscription_url_iv`, `subscription_url_tag` | bytea/text nullable | Authenticated encryption metadata. |
| `key_version` | smallint | Enables key rotation. |
| `token_version` | integer | Optimistic concurrency control for refresh rotation. |
| `created_at`, `updated_at` | timestamptz | Audit timestamps without secret values. |

Security:

- Enable RLS and create **no** `anon` or `authenticated` policies.
- Access only through a new `lib/supabase/admin.ts` that imports a server-only service-role key.
- Never return this row from any API response, log it, include it in an exception, or pass it to OpenAI.

### `calendar_sources`

Safe metadata for calendars selected beneath a connection.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID PK | Internal source ID. |
| `user_id` | UUID FK | Direct ownership for RLS and queries. |
| `connection_id` | UUID FK | Cascades on disconnect. |
| `provider` | text | Denormalized for filtering and checks. |
| `calendar_name` | text | The only provider calendar metadata exposed to UI. |
| `external_id_hash` | text | HMAC for uniqueness/deduplication. |
| `is_enabled` | boolean | User can include/exclude a calendar. |
| `created_at`, `updated_at` | timestamptz | Standard timestamps. |

Unique `(connection_id, external_id_hash)`; owner RLS applies.

### `calendar_source_credentials`

Stores the encrypted provider calendar ID needed for provider API calls.

- `source_id` UUID PK/FK with cascade.
- `encrypted_external_id`, `iv`, `tag`, `key_version`.
- RLS enabled with no browser/user policy; server-admin access only.

This split is necessary because Google calendar IDs and Microsoft identifiers may contain or reveal account information.

### `calendar_event_cache`

Short-lived cache of only normalized fields.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID PK | Public opaque event reference. |
| `user_id` | UUID FK | Owner scope. |
| `connection_id`, `source_id` | UUID FK | Cascades on disconnect. |
| `external_event_hash` | text | HMAC only; no raw provider event ID. |
| `title` | text | Maximum 300 characters. |
| `starts_at`, `ends_at` | timestamptz | Indexed with user. |
| `location` | text nullable | Maximum 500 characters. |
| `provider`, `calendar_name` | text | Normalized source display. |
| `expires_at` | timestamptz | Hard TTL. |
| `fetched_at` | timestamptz | Cache freshness. |

Retention:

- Fetch only the requested local date, with a small UTC buffer for timezone boundaries.
- Default cache TTL: 15 minutes for freshness; hard-delete rows no later than 48 hours after `ends_at`.
- No descriptions, attendees, organizer, conference links, attachments, emails, or raw payload JSON.
- Unique `(user_id, source_id, external_event_hash, starts_at)` for idempotent recurrence instances.
- Owner RLS for event display; all writes server-side.

This table is an ingestion cache only. Dress My Day and AI routes do not query it directly; the Daily Agenda builder is its sole product-facing consumer.

### `daily_agendas`

One internal agenda per user, local date, and timezone interpretation.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID PK | Internal agenda ID. |
| `user_id` | UUID FK | Direct ownership; RLS required. |
| `agenda_date` | date | Date in the user's IANA timezone. |
| `timezone` | text | IANA timezone used to build day boundaries. |
| `status` | text | `building`, `ready`, `partial`, `error`. |
| `weather_context` | JSONB nullable | Versioned minimal weather snapshot only; no provider payload. |
| `generated_at` | timestamptz | Last successful composition time. |
| `expires_at` | timestamptz | Rebuild/freshness boundary, not historical retention. |
| `created_at`, `updated_at` | timestamptz | Standard timestamps. |

Constraints and indexes:

- Unique `(user_id, agenda_date, timezone)`.
- Index `(user_id, agenda_date)`.
- Owner RLS for read access; writes through server agenda services.
- `weather_context` schema contains only summary, temperature, precipitation chance, relevant location, fetched time, and schema version.

### `daily_agenda_items`

Provider-independent items consumed by every daily styling feature.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID PK | Internal item ID returned to the UI. |
| `agenda_id` | UUID FK | Cascades with agenda deletion. |
| `user_id` | UUID FK | Direct owner scope and RLS. |
| `source` | text | `manual`, `calendar`, `travel`, `reservation`, `reminder`. |
| `source_record_id` | UUID nullable | Owned internal manual/travel/reservation/reminder row only. Never a provider ID. |
| `source_ref_hash` | text nullable | HMAC reference used to reconcile external instances. |
| `kind` | text | Meeting, dinner, travel, flight, workout, social, wedding, vacation, appointment, other. |
| `title` | text | Sanitized, length-limited display title. |
| `starts_at`, `ends_at` | timestamptz nullable | Null for truly untimed all-day context where appropriate. |
| `is_all_day` | boolean | Required. |
| `location` | text nullable | Minimal location string. |
| `occasion` | text nullable | Rule/AI-enriched styling occasion. |
| `inferred_dress_code` | text nullable | Styling guidance, explicitly marked inferred. |
| `inference_confidence` | text | `low`, `medium`, `high`. |
| `inference_method` | text | `none`, `rules`, `ai`, `user`. |
| `inference_version` | text nullable | Supports explainability and reprocessing. |
| `provider`, `calendar_name` | text nullable | Source disclosure for calendar items only. |
| `is_read_only` | boolean | True for calendar/connected external sources. |
| `source_updated_at` | timestamptz nullable | Reconciliation timestamp. |
| `expires_at` | timestamptz nullable | Calendar-derived projection retention. |
| `created_at`, `updated_at` | timestamptz | Standard timestamps. |

Constraints:

- Owner RLS and `(user_id, agenda_id, starts_at)` index.
- Unique idempotency constraint for external projections: `(agenda_id, source, source_ref_hash, starts_at)` where a hash exists.
- Check that calendar items are read-only and include provider/calendar name.
- Check that manual items reference an owned manual source when `source_record_id` is present.
- Calendar-derived items inherit the cache retention limit and are deleted/rebuilt; manual and user-confirmed styling history remain in their domain tables.

Daily Agenda does not become a permanent activity history. It is a current-day composition/read model. Durable evidence that the user requested, selected, or wore a recommendation belongs in recommendation and Wardrobe History records.

### `calendar_oauth_states`

Short-lived server-only OAuth transaction records:

- hashed `state` primary/unique value;
- `user_id`, provider, PKCE verifier ciphertext/IV/tag, intended return path;
- `expires_at`, `consumed_at`, `created_at`;
- no authenticated policies; delete after use or within 15 minutes.

Do not put user IDs, return paths, or PKCE verifiers directly into unsigned `state` parameters.

### Recommendation schema adaptation

Refactor recommendation persistence around Daily Agenda without copying calendar history into `daily_events`:

- Make `outfit_recommendations.daily_event_id` nullable.
- Add nullable `daily_agenda_item_id` for request-time traceability while the agenda item exists.
- Add `agenda_context` JSONB containing only the selected item's Daily Agenda fields, relevant agenda-level weather, enrichment version, and schema version.
- For manual events, retain the current FK for compatibility while recommendations transition to the agenda service.
- For calendar and other agenda items, keep no long-lived dependency on expiring ingestion/cache rows; the compact snapshot exists only because the user explicitly requested a recommendation.
- Update “I wore this” to use validated `agenda_context` for date, event title, occasion, and location when the original agenda item has expired.
- Add a check requiring either a compatible manual `daily_event_id` or a validated `agenda_context`.

This preserves Wardrobe History functionality without retaining unselected calendar history.

## OAuth architecture

### Shared flow

1. An already authenticated Curated user chooses a provider in Dress My Day or Profile → Calendar connections.
2. Browser sends a same-origin `POST` to the provider connect route.
3. Server verifies the Supabase session, creates a cryptographically random state, generates a PKCE verifier/challenge, stores the hashed state transaction with a 10–15 minute expiry, and returns or redirects to the provider authorization URL.
4. Provider redirects to a server callback route.
5. Callback validates the current Curated session, state, expiry, one-time consumption, provider, and PKCE verifier before exchanging the authorization code server-to-server.
6. Server validates the exact granted scopes. Broader/unexpected scopes fail closed and are not stored.
7. Server encrypts tokens, creates connection metadata, discovers calendars using only calendar APIs, and redirects to a safe internal completion page.
8. Browser receives only connection ID, provider, label, status, safe calendar names, and enablement state.

Additional controls:

- `SameSite=Lax`, `Secure`, `HttpOnly` cookies where a transaction cookie is used.
- Strict allowlist for post-OAuth return paths.
- Rate-limit connect, callback, refresh, sync, and disconnect operations.
- Never accept provider, redirect URI, token endpoint, scopes, or calendar API base URL from browser input.
- One callback can create an additional connection rather than overwriting another provider/account.
- OAuth redirect URIs must exactly match production, preview (if enabled), and local configuration.

### Google Calendar — Phase 1

Request only:

- `https://www.googleapis.com/auth/calendar.events.readonly`
- `https://www.googleapis.com/auth/calendar.calendarlist.readonly`

Do not request `calendar`, `calendar.events`, Gmail, Contacts, `userinfo.email`, or write scopes. Use `access_type=offline`, PKCE, and an explicit consent prompt when a refresh token is required. Google may return a refresh token only on the initial offline grant; reconnect logic must explain when re-consent is necessary.

Use Calendar List only to obtain safe calendar names and encrypted IDs. Use Events `list` with `timeMin`, `timeMax`, `singleEvents=true`, selected calendar ID, and fields projection limited to event ID (for hashing), summary, start, end, and location. Do not request/store attendees, descriptions, creators, organizers, attachments, or conference data.

Google may require OAuth verification for production use of sensitive calendar scopes; verification, privacy-policy URLs, authorized domains, and consent-screen review are release gates rather than post-launch tasks.

### Microsoft Outlook / Microsoft 365 — Phase 2

Begin with delegated scopes:

- `offline_access`
- `Calendars.ReadBasic`

Use the `common` authorization tenant only if both personal Microsoft accounts and organizational accounts are supported. Validate in a provider spike that `Calendars.ReadBasic` supplies title, start, end, location, and calendar listing for both account types. Escalate to delegated `Calendars.Read` only if a documented required endpoint cannot serve the product fields; record the reason and update consent copy before changing scope.

Do not request `Calendars.ReadWrite`, `Mail.Read`, `Contacts.Read`, shared-mailbox scopes, or application permissions. Use Microsoft Graph `$select=subject,start,end,location,id` and bounded calendar-view endpoints. Do not ingest body, attendees, organizer, online meeting, attachments, or extensions.

Microsoft refresh-token rotation must atomically replace the stored refresh token when a new one is returned.

### Apple Calendar / ICS — Phase 3

This phase is a read-only subscription URL, not Apple OAuth and not CalDAV credential collection.

- Accept only an explicit HTTPS iCal/ICS subscription URL supplied by the user.
- Encrypt the full URL at rest because the URL itself is a bearer secret.
- Never return the saved URL after creation; show only a redacted host/label.
- Perform server-side SSRF protection: resolve DNS, block loopback/private/link-local/reserved IPs for IPv4 and IPv6, revalidate every redirect target, limit redirects, require HTTPS, set a short timeout, cap response size, and accept only calendar content.
- Parse defensively with recurrence and timezone limits to prevent resource exhaustion.
- Extract only the normalized fields and discard raw ICS bytes immediately.
- Explain that anyone possessing the subscription URL may be able to read that calendar and that revocation may require regenerating the URL in Apple Calendar/iCloud.

## Server modules

Add a dedicated boundary:

```text
types/calendar.ts
types/daily-agenda.ts
lib/calendar/
  connections.ts
  credentials.ts
  crypto.ts
  oauth-state.ts
  normalize.ts
  sync.ts
  providers/
    provider.ts
    google.ts
    microsoft.ts
    ics.ts
lib/daily-agenda/
  repository.ts
  builder.ts
  sources/
    manual-events.ts
    calendar-events.ts
    travel.ts
    reservations.ts
    reminders.ts
  classify.ts
  enrich.ts
  weather-context.ts
  recommendation-context.ts
lib/supabase/admin.ts
```

Provider interface responsibilities:

- build authorization URL where applicable;
- exchange authorization code;
- refresh access token;
- revoke token where supported;
- list calendars;
- list bounded events;
- normalize provider errors into safe internal codes;
- never expose provider response objects outside the adapter.

Daily Agenda responsibilities:

- collect bounded, user-owned source projections;
- map `CalendarEvent` into read-only agenda items;
- merge manual, calendar, travel, reservation, and reminder inputs;
- deduplicate overlapping source records without silently dropping distinct events;
- sort all-day and timed items in the user's timezone;
- classify supported item kinds;
- enrich occasion and dress-code guidance;
- attach minimal location-aware weather context;
- return a single `DailyAgenda` DTO to every consumer.

`lib/calendar/crypto.ts` must use authenticated encryption (AES-256-GCM or a managed KMS/envelope-encryption equivalent), a fresh random nonce per encryption, associated data containing connection ID/provider/key version, and key-versioned decryption for rotation.

## API routes

All mutation routes require the current Supabase user, pass same-origin/CSRF protections, validate ownership server-side, and return `Cache-Control: private, no-store`.

| Route | Method | Responsibility |
| --- | --- | --- |
| `/api/calendar/connections` | GET | Return safe connection and selected-calendar metadata. |
| `/api/calendar/connect/google` | POST | Begin Phase 1 OAuth; create state/PKCE transaction. |
| `/api/calendar/callback/google` | GET | Validate transaction, exchange code, encrypt credentials, discover calendars. |
| `/api/calendar/connect/microsoft` | POST | Begin Phase 2 OAuth. |
| `/api/calendar/callback/microsoft` | GET | Complete Phase 2 OAuth and calendar discovery. |
| `/api/calendar/connect/ics` | POST | Validate and encrypt a Phase 3 HTTPS subscription URL. |
| `/api/calendar/connections/[id]/sources` | GET | Return safe calendar names and selected state. |
| `/api/calendar/connections/[id]/sources` | PATCH | Enable/disable owned calendars; no provider writes. |
| `/api/calendar/connections/[id]/sync` | POST | User-initiated bounded refresh. |
| `/api/calendar/connections/[id]` | DELETE | Revoke where supported and delete credentials, sources, cached events, and their agenda projections. |
| `/api/daily-agenda?date=YYYY-MM-DD` | GET | Build/return the provider-independent agenda consumed by Dress My Day and future features. |
| `/api/daily-agenda/items/[id]/recommendations` | POST | Verify an owned agenda item and create a recommendation from its compact agenda context. |
| `/api/calendar/cron/cleanup` | POST | Vercel Cron-only removal of expired OAuth state, event cache, and calendar-derived agenda projections. |

Do not put provider tokens, raw event IDs, raw calendar IDs, subscription URLs, provider errors, or OAuth codes in query parameters returned to client UI.

## Required environment variables

Existing Supabase and site variables remain. Add server-only variables per environment:

```text
# Server-only Supabase administrative access for secret tables.
SUPABASE_SERVICE_ROLE_KEY=

# 32-byte base64 keys; active version supports rotation.
CALENDAR_TOKEN_ENCRYPTION_KEY_V1=
CALENDAR_TOKEN_ENCRYPTION_ACTIVE_VERSION=1
CALENDAR_IDENTIFIER_HMAC_KEY=

# Google Phase 1
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GOOGLE_CALENDAR_REDIRECT_URI=

# Microsoft Phase 2
MICROSOFT_CALENDAR_CLIENT_ID=
MICROSOFT_CALENDAR_CLIENT_SECRET=
MICROSOFT_CALENDAR_REDIRECT_URI=
MICROSOFT_CALENDAR_TENANT=common

# Scheduled cleanup/sync authentication
CALENDAR_CRON_SECRET=
```

Rules:

- None may use `NEXT_PUBLIC_`.
- Use separate OAuth applications, redirect URIs, encryption keys, and Supabase projects for local/preview/production.
- Do not enable calendar OAuth in arbitrary public Vercel previews unless their redirect origins are explicitly registered and their data environment is isolated.
- Secret rotation must retain prior decryption keys until all rows are re-encrypted.

## Token refresh strategy

1. Provider service reads safe connection metadata with an ownership constraint.
2. Server-admin credential repository loads and decrypts tokens only inside the request/job performing provider access.
3. If access token expiry is more than five minutes away, use it; otherwise acquire a refresh lock with optimistic `token_version` or a PostgreSQL advisory/row lock.
4. Refresh server-to-server using fixed provider endpoints and client credentials.
5. Encrypt and atomically store the new access token, expiry, and rotated refresh token when present. Never erase a valid refresh token when Google omits one.
6. Zero/drop plaintext references as soon as practical and never log token responses.
7. On `invalid_grant` or revoked consent, mark connection `needs_reauth`, delete unusable access material, stop automatic retries, and show a reconnect action.
8. Retry transient provider/network errors with capped exponential backoff and jitter. Do not retry authentication failures indefinitely.
9. Disconnect attempts provider revocation first but always deletes Curated's local credentials even if provider revocation is unavailable or fails.

## Sync and retention strategy

### Phase 1 recommendation

Use demand-driven daily synchronization and agenda composition first:

- Dress My Day calls `/api/daily-agenda?date=<user-local-date>` and never calls a calendar route.
- The Daily Agenda builder determines which source projections are stale. Its calendar source adapter requests synchronization through the internal calendar service.
- Calendar service fetches only enabled calendars and only the local-day time window, expanded slightly in UTC for offset safety.
- Serve an unexpired 15-minute cache when available; otherwise refresh enabled sources in parallel with strict timeouts and modest concurrency.
- Map cached `CalendarEvent` values into `daily_agenda_items`, then merge manual events and any available travel/reservation/reminder projections.
- Resolve weather after agenda composition so the weather service can use relevant item location/time as well as the user's current/home location. Store only the minimal agenda weather context.
- Provide a visible manual Refresh action and last-updated status.
- Do not add provider webhooks in Phase 1; Google watch channels add lifecycle and callback complexity that is unnecessary for one-day context.

Scheduled jobs:

- A Vercel Cron cleanup route deletes expired OAuth states and event cache.
- Optional morning prefetch may run only for active users who explicitly enabled automatic calendar loading; fetch today only in their profile timezone.
- Do not sync dormant users or backfill history.

Later phases may add provider incremental sync tokens only after retention and operational needs are demonstrated. If added, store sync cursors in server-only metadata and still retain only minimal in-window event rows.

## Daily Agenda enrichment

### Classification pipeline

Enrichment occurs only after source normalization and before Dress My Day reads the agenda:

1. **Deterministic rules first.** Classify obvious terms, time patterns, duration, and location categories into meeting, dinner, travel, flight, workout, social, wedding, vacation, appointment, or other.
2. **Structured AI only when useful.** Ambiguous items may be sent to the server-side AI enricher as a small batch containing only title, start/end, all-day status, and location.
3. **Schema-validated output.** AI returns `kind`, `occasion`, `inferredDressCode`, confidence, and a short non-sensitive rationale for internal debugging only. Unexpected values fail closed to `other`/low confidence.
4. **User correction wins.** A future user confirmation or correction sets `inference_method="user"` and must not be overwritten by later automatic enrichment for the same item instance.
5. **Versioned and replaceable.** Rules and prompt/schema versions are stored so today's read model can be rebuilt without turning an inference into permanent profile truth.

### Occasion and dress-code inference

- A weekday morning “Board presentation” may become `meeting`, occasion `professional presentation`, inferred dress code `polished business`, medium confidence.
- “Dinner at Le Bernardin” may become `dinner`, occasion `evening dining`, inferred dress code `elevated evening`, medium confidence.
- “JFK → LHR” may become `flight`, occasion `long-haul travel`, inferred dress code `polished travel layers`, medium/high confidence.
- “Tennis” may become `workout`, occasion `court activity`, inferred dress code `tennis activewear`, high confidence.
- “Sam & Alex wedding” may become `wedding`, but dress code remains null/low confidence unless the title supplies a credible formality signal.
- A multi-day/all-day “Amalfi” entry may become `vacation`, while each day's agenda still accounts for timed plans.

AI must not infer protected characteristics, relationships, religion, medical purpose, or other sensitive meaning from ambiguous titles/locations. “Appointment” remains an appointment unless the user explicitly supplies more context. Inferred dress codes are suggestions, visibly labeled and editable, never claims about venue policy.

### Consumers and producers

- Calendar, manual schedule, travel itinerary, reservations, and reminders are source adapters that populate agenda items.
- Weather is an agenda enricher: it consumes agenda times/locations, fetches the minimum forecast, and attaches a minimal weather context.
- Dress My Day renders `DailyAgenda` only.
- AI recommendation services accept a validated agenda/item context only.
- Travel, reservation, and reminder features read the same agenda to coordinate the day and may contribute owned source records through their adapters; they do not call calendar providers.
- Future integrations must implement an agenda source/enricher contract rather than adding direct dependencies to Dress My Day or AI routes.

## Dress My Day integration

### User experience

- Add a quiet “Calendars” panel near the existing schedule section.
- Unconnected state explains exactly what Curated reads and provides “Connect Google Calendar.”
- Connected state lists multiple connections and calendar names with individual include/exclude controls, last refresh, reconnect, and disconnect.
- Display `DailyAgenda.items` in one chronological presentation, distinguishing manual and external sources and showing provider/calendar name only as source disclosure.
- Provider events do not show Edit, Remove, reorder, RSVP, or write controls.
- Manual entry remains available and unchanged.
- Calendar errors are isolated per connection and never remove manual events from the page.

### Agenda-driven recommendations

- Treat every agenda title/location as untrusted data, never instructions.
- Refactor the current recommendation route into a shared server service accepting a validated `DailyAgendaItem`, agenda weather context, owned wardrobe, profile, and recent wears.
- Let the stylist consider the whole day's timing and transitions (for example workout → meeting → dinner) while recommending for one item, but send only the smallest relevant subset of agenda items.
- Send OpenAI only agenda fields required for the recommendation. Never send provider connection identifiers, raw IDs, tokens, calendar URL, attendees, descriptions, or provider payloads.
- If an event title appears sensitive, allow the user to exclude the event/calendar and avoid exposing it in generated rationale unnecessarily.

## Disconnect and deletion flow

1. User selects Disconnect on a specific owned connection.
2. UI explains that Curated will stop loading it and delete saved credentials and short-lived event cache; the provider's calendar remains unchanged.
3. Same-origin `DELETE /api/calendar/connections/[id]` reauthenticates the Supabase session and verifies `user_id` ownership.
4. Mark status `disconnecting` to prevent concurrent refresh/sync.
5. Attempt provider token revocation with a short timeout. ICS has no remote revoke operation.
6. In one database transaction, delete source secrets, source metadata, credential row, cached events, calendar-derived Daily Agenda items, OAuth states for that provider/connection, then connection metadata. Foreign-key cascades must not delete manual, travel, reservation, or reminder agenda sources.
7. Record only a non-sensitive operational audit event if audit logging exists; do not retain token, URL, event, or account identifiers.
8. Return success even when remote revocation fails after local credential deletion; explain that the user may also remove Curated from the provider's connected-app settings.
9. Account deletion must invoke the same cleanup for every connection before/alongside deleting the Supabase user.

## Privacy and security risks

| Risk | Mitigation |
| --- | --- |
| Scope creep | Hard-code and test exact read-only scope allowlists; fail when unexpected scopes are granted. |
| Credential exposure through Supabase REST/RLS | Split secret tables, no authenticated policies, server-only service-role repository, ownership check before admin access. |
| Database compromise | AES-256-GCM/envelope encryption, key versioning, HMAC identifiers, secret rotation, minimal access-token lifetime. |
| OAuth account-linking CSRF | Authenticated start, random one-time state, PKCE, expiry, session/user binding, safe redirect allowlist. |
| Tokens in logs/errors/analytics | Structured error codes, response redaction, logging tests, no raw provider response logging. |
| Excess calendar collection | Fields projection, today's bounded window, enabled calendars only, 15-minute cache, 48-hour hard deletion. |
| Sensitive event titles/locations | Explicit consent, calendar exclusions, minimal AI context, no attendee/description collection, discreet UI/rationale. |
| Cross-user access | `user_id` on metadata/cache, RLS, server ownership filters, unguessable UUIDs, integration tests with two users. |
| Refresh race/rotation loss | Optimistic token version or database lock; atomic replacement preserving old Google refresh token when omitted. |
| ICS SSRF | HTTPS only, IP/DNS allow checks before and after redirects, size/time/redirect limits, defensive parser. |
| ICS bearer URL disclosure | Encrypt URL, never echo it, redact UI/logs, delete on disconnect. |
| Provider outage/rate limits | Cached minimal data, bounded retries, manual schedule fallback, per-connection error isolation. |
| Stale/deleted provider events | Short TTL and on-demand refresh; identify cache rows by hashed provider ID/instance time. |
| OAuth consent misunderstanding | Plain-language pre-consent screen listing exact fields and confirming no writes, email, contacts, or attendees. |
| AI prompt injection in titles/location | Treat calendar strings as quoted untrusted data; structured prompts and output schema; never execute embedded instructions. |
| Provider coupling leaks into product features | Enforce module boundaries: only calendar ingestion produces `CalendarEvent`; every product feature accepts `DailyAgenda`. |
| Incorrect occasion/dress-code inference | Rules first, confidence labels, constrained AI schema, sensitive-inference prohibition, user correction, versioned rebuilds. |
| Agenda becomes permanent behavioral history | Date-scoped read model, source-specific TTLs, no historical backfill, compact recommendation snapshot only after user action. |

Security review gates:

- Threat model OAuth, service-role use, token crypto, ICS fetch, disconnect, and account deletion.
- Verify CSP and callback behavior do not leak query parameters to third parties.
- Add secret-scanning and redaction tests.
- Confirm Vercel/Supabase logs do not contain request bodies for token routes.
- Complete provider verification/security requirements before public launch.

## Testing strategy

- Unit tests for provider normalization, timezone day bounds, all-day events, recurrence instances, title/location truncation, and CalendarEvent → DailyAgenda mapping.
- Daily Agenda contract tests for meetings, dinners, travel, flights, workouts, social events, weddings, vacations, appointments, all-day ordering, multi-source deduplication, and partial source failure.
- Enrichment tests for deterministic classification, constrained AI output, confidence, user overrides, version changes, and prohibited sensitive inference.
- Unit tests for encryption/decryption, tamper detection, key rotation, HMAC IDs, and redaction.
- OAuth tests for state mismatch, reuse, expiry, wrong user, missing PKCE, denied consent, unexpected scope, and safe redirects.
- Provider contract tests using recorded **synthetic/redacted** fixtures only.
- Two-user authorization tests for every connection, source, cache, recommendation, sync, and delete path.
- Refresh concurrency tests and rotated/omitted refresh-token cases.
- ICS SSRF tests for localhost, private IPv4/IPv6, DNS rebinding, redirect chains, oversized files, malformed recurrence, and timeouts.
- Retention tests proving cleanup removes expired events/states and disconnect cascades all secrets/cache.
- UI tests for zero, one, and multiple connections; partial provider failure; reconnect; exclusions; mobile layout; manual-event fallback; and mixed manual/calendar/travel agendas.
- End-to-end test proving browser responses and client bundles never contain access tokens, refresh tokens, provider calendar IDs, or ICS URLs.
- Architectural dependency test proving Dress My Day, weather coordination, AI recommendations, travel, reservations, reminders, and future feature modules do not import calendar provider adapters.

## Observability

Use sanitized, low-cardinality metrics:

- connection success/failure by provider and safe error code;
- refresh success, `needs_reauth`, and latency;
- sync freshness, duration, event count bucket, and rate-limit response;
- cleanup row counts by table;
- disconnect completion and remote-revocation outcome;
- Daily Agenda build success/partial/failure, item count bucket, source type, and enrichment confidence bucket without event content;
- Dress My Day recommendation success by agenda source/kind without titles or locations.

Never include titles, locations, calendar names, account IDs, raw provider errors, URLs, OAuth codes, or tokens in metrics/traces.

## Phased implementation tasks

### Phase 0 — security and provider-neutral foundation

1. Approve this plan and complete a focused threat model.
2. Confirm Google OAuth verification requirements and production consent copy.
3. Add server-only Supabase admin client and test that imports cannot enter client bundles.
4. Implement encryption/HMAC modules with key rotation and tamper tests.
5. Add schema, SQL migrations, RLS, secret-table no-policy posture, and retention indexes.
6. Add `CalendarEvent`, provider interface, normalizer, connection repository, OAuth-state service, and safe ingestion DTOs.
7. Add the Daily Agenda schema, types, repository, builder, source-adapter contracts, classification/enrichment boundary, weather context, and retention behavior.
8. Project current manual `daily_events` into Daily Agenda and refactor Dress My Day to read `/api/daily-agenda` before enabling a provider.
9. Refactor recommendation creation to consume agenda context and update recommendation/history persistence.
10. Add calendar connection UI shell and feature flag with providers disabled.

Exit criteria: no provider connected yet; manual Dress My Day works entirely through Daily Agenda; schema/security boundaries and shared recommendation behavior are tested.

### Phase 1 — Google Calendar

1. Register separate Google OAuth apps/environments and exact redirect URIs.
2. Implement Google connect/callback with state, PKCE, exact read-only scopes, offline access, and encrypted tokens.
3. Implement calendar discovery, safe names, encrypted calendar IDs, and enable/disable controls.
4. Implement bounded today's-events retrieval with strict field projection and normalization into `CalendarEvent`.
5. Add 15-minute minimal cache, manual Refresh, last-updated state, and 48-hour cleanup cron.
6. Map Google events into Daily Agenda; keep Dress My Day unaware of Google and calendar-cache schemas.
7. Validate meeting, dinner, travel, flight, workout, social, wedding, vacation, and all-day enrichment behavior.
8. Add agenda-item recommendation and Wardrobe History transition using minimal agenda snapshots.
9. Implement reconnect, revoke/disconnect, account deletion hook, observability, privacy copy, and end-to-end security tests.
10. Complete Google OAuth verification before broad production availability.

Exit criteria: multiple Google connections/calendars populate Daily Agenda read-only; no Dress My Day/AI provider dependency exists; no tokens/raw IDs reach browser; disconnect removes credentials, cache, and provider-derived agenda items.

### Phase 2 — Microsoft Outlook / Microsoft 365

1. Validate `Calendars.ReadBasic` field/endpoint sufficiency across personal and organizational accounts.
2. Register Microsoft apps/redirect URIs and document tenant support.
3. Implement Microsoft OAuth, PKCE/state, `offline_access`, encrypted rotating refresh tokens, and `needs_reauth` behavior.
4. Implement Graph calendar discovery and bounded calendar-view normalization.
5. Reuse the CalendarEvent → DailyAgenda adapter, connection UI, cache, agenda recommendation context, cleanup, disconnect, and observability boundaries.
6. Test consent/admin-policy failure, personal/work accounts, token rotation, throttling, and provider outage isolation.

Exit criteria: Google and Microsoft connections can coexist; shared domain/UI requires no provider-specific branching outside adapters and connection branding.

### Phase 3 — Apple Calendar via ICS subscription

1. Finalize plain-language security guidance for subscription URLs.
2. Implement encrypted URL connection and redacted connection metadata.
3. Implement hardened server-side HTTPS fetcher and SSRF/redirect/DNS defenses.
4. Add bounded ICS parser, timezone/recurrence handling, event normalization, and raw-byte disposal.
5. Reuse cache, CalendarEvent → DailyAgenda mapping, agenda recommendation context, manual refresh, cleanup, and disconnect.
6. Test large/malformed calendars, recurring events, timezone changes, unavailable feeds, URL rotation, and deletion.

Exit criteria: ICS feeds are read-only, URLs remain secret, and malicious endpoints/calendar files cannot reach private infrastructure or exhaust server resources.

### Post-launch hardening

1. Review actual sync frequency and provider rate limits before considering webhooks/incremental sync.
2. Run encryption-key rotation rehearsal and credential-deletion audit.
3. Add account export/deletion coverage for safe connection metadata while excluding token ciphertext.
4. Reassess retention, consent language, and AI agenda-context minimization from production evidence.

## Explicit non-goals

- Creating, editing, deleting, moving, accepting, declining, or responding to calendar events.
- Email, contacts, attendee, organizer, attachment, conferencing, or message access.
- Full calendar-history import or long-term event archive.
- Calendar-derived proactive notifications in the initial phases.
- CalDAV username/password or Apple ID credential collection.
- Using calendar connections as Curated sign-in providers.
- Sending provider tokens, IDs, raw payloads, or ICS URLs to OpenAI.
- Allowing Dress My Day, AI, weather, travel, reservations, reminders, or future integrations to call calendar provider APIs directly.

## Implementation approval checklist

Before Phase 0 code begins, approve:

- the secret-table/service-role boundary;
- encryption key ownership and rotation process;
- exact Google scopes and consent wording;
- 15-minute cache / 48-hour hard-retention policy;
- minimal recommendation agenda snapshot policy;
- Daily Agenda schema, source precedence, retention, enrichment confidence, and user-correction policy;
- Google OAuth verification timeline;
- provider disconnect and full account-deletion behavior;
- Phase 3 ICS SSRF requirements.

## Authoritative provider references

- Google Calendar scopes: <https://developers.google.com/workspace/calendar/api/auth>
- Google server-side OAuth and offline access: <https://developers.google.com/identity/protocols/oauth2/web-server>
- Microsoft Graph permission reference: <https://learn.microsoft.com/graph/permissions-reference>

Provider documentation and consent requirements must be rechecked at the start of each implementation phase because scopes, verification rules, and token behavior can change.
