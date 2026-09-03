# Curated by Carly: Vercel-First Data Blueprint

> **Implementation decision — July 10, 2026:** Supabase is the selected managed PostgreSQL, authentication, and private Storage platform. Vercel remains the Next.js host and Prisma remains the application data layer. References below to Auth.js, Neon, or Vercel Blob describe the earlier proposal and are superseded by this decision where they conflict.

## Purpose

This document defines the long-term persistence, hosting, and intelligence architecture for Curated by Carly. It replaces the earlier Supabase direction with a Vercel-first platform approach while protecting the product's defining qualities: privacy, editorial restraint, and a personal wardrobe experience that never feels like inventory software.

This is a planning document only. It does not add hosting, a database, authentication, photo upload, calendar connections, or AI functionality.

## Current Application Assessment

Curated by Carly is a Next.js App Router application with route-oriented UI and a typed, in-memory Digital Closet. Clothing items currently reset on refresh, and the project contains no database client, authentication provider, object-storage integration, server data layer, or background-processing infrastructure.

The current clothing model is a sound initial boundary for persistence:

```ts
type ClothingItem = {
  designer: string;
  itemName: string;
  category: string;
  color: string;
  season: string;
  favorite: boolean;
};
```

Persistence should strengthen this model behind typed repositories and Server Actions. Visual components should remain focused on the editorial experience and must not perform ad hoc database or storage calls.

## Platform Direction

### Vercel Hosting

Use Vercel as the deployment and operations platform for the Next.js application.

- Deploy the production application from the protected main branch.
- Create preview deployments for pull requests and a separate development environment for safe iteration.
- Store secrets in Vercel project environment variables, scoped separately to development, preview, and production.
- Use Vercel observability, function logs, and analytics to monitor application health and performance.
- Keep the app primarily server-rendered, using Client Components only where interaction requires them.

### Postgres on Vercel

Vercel Postgres is no longer provisioned for new projects. For a current Vercel-first implementation, connect a managed PostgreSQL provider through the Vercel Marketplace; Neon is the recommended default because it is the direct successor for former Vercel Postgres projects and integrates with Vercel environment management.

This blueprint uses “Vercel Postgres” to mean this Vercel-connected PostgreSQL layer, not the retired standalone product. Vercel's current documentation directs new projects to Marketplace Postgres integrations. [Postgres on Vercel](https://vercel.com/docs/postgres)

Use PostgreSQL as the durable source of truth for user-owned application data. Choose a typed query and migration layer at implementation time—Prisma is the default recommendation for its mature migrations, generated types, and compatibility with Auth.js—but keep all queries behind repositories so an ORM remains replaceable.

### Vercel Blob Storage

Use a private Vercel Blob store named `curated-wardrobe-media` for wardrobe photography and future user avatars. Blob Storage holds file bytes; PostgreSQL stores only ownership, object pathnames, dimensions, content metadata, and editorial order.

Private Blob storage is required because wardrobe photos are personal content. Files must be delivered through an authenticated Vercel Function after ownership verification, never by a permanent public URL. Vercel Blob supports private stores and delivery through Functions. [Vercel Blob documentation](https://vercel.com/docs/vercel-blob)

### Vercel Functions and Edge Runtime

Use standard Vercel Functions with the Node.js runtime for database mutations, authenticated data access, AI requests, calendar OAuth token exchange, image processing coordination, and any code needing Node.js libraries or database transactions.

Use the Edge runtime only where it provides a clear benefit: very small, latency-sensitive request logic that uses Web APIs and does not depend on Node.js libraries or a distant database. Suitable examples include lightweight geolocation-aware weather routing, request-time experimentation, or streaming a simple personalized shell. Avoid Edge runtime for primary database writes and complex AI orchestration unless the selected database region and library support make that choice demonstrably beneficial.

Vercel now recommends Node.js for improved performance and reliability in most new function workloads; the Edge runtime has a smaller API surface and can incur extra latency when it is far from the database. [Vercel Edge runtime guidance](https://vercel.com/docs/functions/runtimes/edge/edge-functions)

## Architectural Principles

- Every durable record belongs to a single authenticated user unless a future sharing feature explicitly introduces membership.
- All user data access happens on the server through a repository that accepts the authenticated user ID.
- Database ownership checks are mandatory in queries and mutations; hiding data in the interface is never authorization.
- File paths encode ownership, but database authorization remains the authority for access.
- Build product features as independent modules that share typed IDs and models, not duplicated columns or cross-feature UI state.
- Use immutable Blob object paths for photos to avoid stale-cache issues and preserve auditability.
- Keep external tokens, AI provider credentials, and calendar secrets server-only.

## Multi-User Data Model

### Identity and user profile

Use Auth.js deployed on Vercel for authentication and session management. Auth.js supports the standard user, account, session, and verification-token persistence tables through its chosen database adapter. Curated by Carly should add a `user_profiles` table for product-specific settings rather than overload the authentication tables.

| Table | Key columns | Responsibility |
| --- | --- | --- |
| `users` | `id`, `email`, `name`, timestamps | Auth.js identity record. |
| `accounts` | provider account identifiers, `user_id` | OAuth provider links. |
| `sessions` | `session_token`, `user_id`, expiry | Durable sessions when using the database session strategy. |
| `verification_tokens` | identifier, token, expiry | Magic-link or email verification flow. |
| `user_profiles` | `user_id`, `display_name`, `timezone`, `avatar_path`, timestamps | Product preferences and editorial-facing account data. |

`user_profiles.user_id` is both its primary key and a foreign key to `users.id`. Store an IANA timezone so calendar, travel, and daily-edit calculations remain correct for each user.

### Core wardrobe tables

| Table | Key columns | Ownership and purpose |
| --- | --- | --- |
| `clothing_items` | `id`, `user_id`, `designer`, `item_name`, `category`, `color`, `season`, `favorite`, timestamps, `deleted_at` | The private wardrobe record; one row belongs to one user. |
| `clothing_photos` | `id`, `user_id`, `clothing_item_id`, `blob_pathname`, `alt_text`, `width`, `height`, `sort_order`, timestamps | Private photo metadata; a garment may have multiple photos. |
| `outfits` | `id`, `user_id`, `name`, `occasion`, `season`, `worn_at`, timestamps | A saved combination and the foundation for previous-outfit history. |
| `outfit_items` | `outfit_id`, `clothing_item_id`, `position` | The garments within an outfit. |

`clothing_items` should preserve the present UI fields, with server defaults for `favorite` and timestamps. Add database checks for known categories and seasons while retaining free-text color. Keep soft deletion optional until actual deletion and restoration behavior is designed.

### Lookbooks and packing

| Table | Key columns | Ownership and purpose |
| --- | --- | --- |
| `lookbooks` | `id`, `user_id`, `title`, `description`, `cover_photo_id`, timestamps | A user's editorial collection of outfits or references. |
| `lookbook_items` | `lookbook_id`, `outfit_id`, `clothing_item_id`, `position` | Ordered lookbook contents; use one nullable target field with a check, or separate join tables if clarity wins. |
| `packing_lists` | `id`, `user_id`, `title`, `destination`, `starts_at`, `ends_at`, timestamps | A user's travel wardrobe plan. |
| `packing_list_items` | `packing_list_id`, `clothing_item_id`, `quantity`, `packed_at`, `position` | The wardrobe pieces selected for a trip. |

Every row in these tables carries or reaches a `user_id`. Cross-user records must be rejected at the repository layer and by foreign-key-aware ownership checks inside transactions.

### AI styling history and Today's Edit

| Table | Key columns | Ownership and purpose |
| --- | --- | --- |
| `styling_sessions` | `id`, `user_id`, `intent`, `created_at` | A conversation or styling task boundary. |
| `styling_messages` | `id`, `session_id`, `role`, `content`, `created_at` | User and assistant messages, retained only according to the privacy policy. |
| `daily_edits` | `id`, `user_id`, `for_date`, `summary`, `context_snapshot`, timestamps | The generated Today's Edit and its minimal decision context. |
| `daily_edit_outfits` | `daily_edit_id`, `outfit_id`, `position`, `selected_at` | Recommended and ultimately selected outfits. |

Store a compact, versioned `context_snapshot` with each generated edit so a recommendation can be understood and reproduced without permanently retaining every external calendar or weather payload.

## Schema Standards and Indexes

- Use UUID primary keys generated by the database.
- Use `timestamptz` for every temporal field and maintain `updated_at` with a trigger or ORM middleware.
- Add `user_id` to all directly user-owned records and index it.
- Create composite indexes for common access patterns: `(user_id, created_at desc)` for closets, `(user_id, favorite)` for favorites, `(user_id, for_date)` for daily edits, and `(user_id, starts_at)` for trips.
- Use foreign keys with intentional deletion behavior: cascade only for dependent private records; prefer restrict or soft deletion for historical styling records.
- Use transactions for operations that create records and their join rows together.
- Version every schema migration in source control and apply migrations through a controlled deployment workflow.

## Authentication and Authorization Architecture

### Authentication

Use Auth.js with a PostgreSQL adapter and secure, HTTP-only session cookies. Begin with email magic links for a calm, low-friction experience. Add Google and Apple sign-in only when they materially improve user onboarding or calendar connection flows.

Auth.js is Vercel's recommended authentication path for Next.js applications on the Vercel platform. [Vercel authentication guide](https://vercel.com/kb/guide/complete-guide-authentication-vercel)

### Authorization

1. Resolve the session on the server for every protected page, Server Action, and Route Handler.
2. Pass only the authenticated `user.id` into data repositories.
3. Require every repository query and mutation to constrain by `user_id`.
4. Verify that a requested child record belongs to the user before reading, altering, deleting, or returning its Blob media.
5. Use parameterized queries or an ORM; never build SQL from user input.

Use route middleware or a Next.js proxy for early redirects and session refresh behavior, but repeat authorization checks in the protected operation itself. A route check improves experience; the server data boundary protects privacy.

## Photo Storage Architecture

### Private storage model

Use the following immutable Blob pathname convention:

```text
wardrobe/{user_id}/items/{clothing_item_id}/{photo_id}-{content_hash}.{extension}
```

Upload flow:

1. The authenticated user creates or identifies their clothing item.
2. A server endpoint validates ownership, MIME type, file size, and requested pathname.
3. The browser uploads with a short-lived, server-authorized upload flow.
4. The server writes the returned Blob pathname and metadata to `clothing_photos`.
5. The app resolves a photo through an authenticated route that verifies the item owner before streaming the private Blob.

### Image quality and safety

- Preserve the original privately; generate card and detail derivatives asynchronously when image tooling is introduced.
- Strip or ignore EXIF location metadata before making derived imagery available.
- Define image dimensions, file-size limits, supported formats, and an editorial crop policy before enabling upload.
- Keep one `cover_photo_id` per item or lookbook; allow ordered supporting photos later.
- Delete Blob objects only after the related database deletion is committed and a recoverability policy is defined.

## Calendar Integrations

Future Apple iCloud Calendar, Google Calendar, and Outlook Calendar connections should use the same provider-neutral integration boundary.

| Table | Key columns | Purpose |
| --- | --- | --- |
| `calendar_connections` | `id`, `user_id`, `provider`, encrypted refresh token reference, selected calendar ID, scopes, sync status | A user's authorized provider connection. |
| `calendar_events` | `id`, `user_id`, `connection_id`, external event ID, starts/ends, title, location, metadata expiry | A minimal, selectively cached view of relevant events. |

Implementation principles:

- Use OAuth 2.0 and provider-approved scopes; never ask for broader calendar access than required.
- Encrypt provider refresh tokens at rest using a managed key and keep decryption server-only.
- Store only the event details needed to create styling context, with a retention window and a user-controlled disconnect/delete workflow.
- Sync through scheduled Vercel Functions or provider webhooks where available; run mutation-heavy work in Node.js.
- Treat iCloud as a dedicated CalDAV integration with its own security and reliability review; do not force it into a Google- or Microsoft-specific abstraction.

## Weather and Travel Context

Weather is transient decision context, not wardrobe data. A weather service should be called server-side with the user's relevant location and date range, then cached briefly by normalized location/date to control cost and latency.

Travel context begins in `packing_lists` and may later include itinerary fields such as destination, date range, formality, planned activities, and climate preferences. Do not infer travel details from calendar data without clear user permission and product messaging.

## AI Stylist and Today's Edit

### Data flow

The AI Stylist must be server-only. It never receives browser database credentials, raw calendar tokens, or unrestricted access to other users' data.

```text
Authenticated user
  -> Server Action or Route Handler
  -> Session and ownership verification
  -> User-scoped repositories
       wardrobe + favorites + previous outfits
       selected calendar context + weather + travel plan
  -> Today's Edit context builder
  -> AI provider request, using server-only credentials
  -> Validated structured recommendation
  -> Persisted daily edit and UI response
```

### Personalization inputs

Today's Edit should combine only the context necessary for the request:

- Current wardrobe, including season, category, color, and favorite pieces.
- Previous outfits and recent Today's Edit choices to avoid repetitive recommendations.
- Calendar-derived occasion, timing, and location context that the user has explicitly connected.
- Forecasted weather for the relevant place and date.
- Travel and packing-list context when the user is away or planning a trip.
- Explicit user intent, such as “client dinner,” “travel day,” or “something effortless.”

The context builder must select a relevant subset of garments instead of sending the entire closet by default. Persist a small, versioned recommendation snapshot and selected outfit IDs; do not persist raw external data or full provider prompts unless required for an explicit, documented product purpose.

### Runtime selection

Run AI requests in a Node.js Vercel Function by default. This keeps database access, schema validation, provider SDK compatibility, observability, retries, and privacy controls together. Use streaming responses only when the interaction benefits from conversational feedback. Do not make AI requests directly from the browser.

## Scaling for Many Users

### Data and application scaling

- Scope all reads and writes by authenticated `user_id` and use composite indexes for each common private view.
- Paginate closets, lookbooks, history, and calendar event lists with cursors rather than loading complete collections.
- Select only fields needed for card views; load photo metadata and full history on demand.
- Keep queries in feature repositories so query plans can evolve without rewriting UI components.
- Use database transactions for multi-table writes such as saved outfits, lookbook composition, and daily edit persistence.
- Align the primary Vercel Function region with the PostgreSQL region to reduce round trips.

### Media scaling

- Keep wardrobe imagery in private Vercel Blob Storage, not in the database or function filesystem.
- Use immutable names and generated derivatives to avoid cache invalidation and reduce repeated transfer.
- Serve card-sized imagery for collection browsing and load larger imagery only for detail experiences.
- Track Blob usage and orphaned object cleanup as an operational responsibility.

### Reliability and operations

- Maintain distinct Vercel projects or environments for development, preview, and production, each with isolated database credentials and Blob stores.
- Use versioned migrations, automated backup verification, and a rehearsed account-deletion process.
- Monitor database latency, Vercel Function errors, Blob access failures, OAuth refresh failures, and AI request volume.
- Use scheduled Vercel Functions for calendar synchronization, cleanup, and background coordination; make each task idempotent.
- Store low-risk, rarely changing feature flags in Vercel Edge Config only when global low-latency reads are needed. It is not a substitute for the relational database. [Vercel Storage overview](https://vercel.com/docs/storage)

## Recommended Folder Structure

When persistence implementation begins, add the following layers without moving unrelated visual components:

```text
app/
  (auth)/
    sign-in/page.tsx
    sign-up/page.tsx
    api/auth/[...nextauth]/route.ts
  api/
    wardrobe-photos/
      route.ts                 # Authenticated Blob delivery or upload authorization
    integrations/
      calendar/
        callback/route.ts
  closet/
    _components/
    _lib/
    page.tsx

lib/
  auth/
    auth.ts                    # Auth.js configuration
    require-user.ts            # Server-side session requirement
  db/
    client.ts                  # Database connection and ORM client
    schema/                    # Versioned application schema definitions
  data/
    clothing-items.ts          # User-scoped wardrobe repository
    outfits.ts
    lookbooks.ts
    packing-lists.ts
    daily-edits.ts
  blob/
    wardrobe-media.ts          # Authorized Blob operations
  ai/
    todays-edit.ts             # Context builder and provider boundary
  integrations/
    calendar/
      providers/
      sync.ts
    weather.ts

types/
  database.ts                  # Generated or ORM-derived database types
  wardrobe.ts                  # Application-facing models

prisma/
  schema.prisma
  migrations/
```

The final migration directory and generated-types location may differ if the team selects Drizzle instead of Prisma. The principle does not change: database mechanics remain in `lib/db`, feature queries in `lib/data`, and presentation code stays database-agnostic.

## Recommended Implementation Sequence

1. Create the Vercel project, environment strategy, Vercel-connected Postgres integration, and private Blob store.
2. Add Prisma (or the selected typed data layer), versioned migrations, Auth.js identity tables, `user_profiles`, and `clothing_items`.
3. Implement Auth.js sign-in, session handling, protected-route behavior, and server-side `requireUser` checks.
4. Add user-scoped clothing repositories and replace only the closet's in-memory persistence boundary; retain its existing form and presentation components.
5. Add private Blob upload authorization and authenticated media delivery after core wardrobe persistence is stable.
6. Add outfits, lookbooks, packing lists, and their join tables when each product flow is designed.
7. Add calendar connections, weather context, and travel-aware packing only with explicit permissions and privacy controls.
8. Add the server-only AI Stylist and Today's Edit, beginning with wardrobe, favorites, and prior outfits before expanding to calendar, weather, and travel context.

This sequence preserves a quiet, premium product experience while giving every user an isolated wardrobe, photo library, editorial history, and durable foundation for future personalization.
