# Curated Site-Wide Operational Reliability Audit

**Audit date:** July 30, 2026  
**Environments reviewed:** Production and Current Founder Preview  
**Scope:** Operational reliability, security boundaries, environment parity, failure handling, and automated coverage. Recommendation quality and V2 recommendation behavior were not changed.

## Executive health summary

| Area | Health | Evidence |
| --- | --- | --- |
| Production application shell and public authentication | Healthy | Production sign-in route loaded successfully with the Curated identity, email/password controls, account creation, and confirmation recovery. |
| Build and static verification | Healthy | Lint, TypeScript, all 245 automated tests, and the Next.js production build passed. |
| Ask Curated / Dress My Day follow-up | Incident | Current Production logs show OpenAI `429 insufficient_quota` responses for the configured OpenAI project. One request used deterministic regeneration; another failed. |
| Travel AI | Incident | Travel uses the same server-side OpenAI client, project key, and model as Ask Curated. The confirmed project quota exhaustion is therefore a shared blocking dependency. No route-specific Travel production trace remained available in the queried log window. |
| Personal Shopper AI | At risk | It uses the same exhausted OpenAI project. Its route already recognizes quota exhaustion and gives a specific response, but useful AI analysis remains unavailable until provider capacity is restored. |
| Current Founder Preview configuration | Degraded | Preview is missing server-only Supabase administration and calendar variables that exist in Production. Admin-backed Preview functions and calendar integrations cannot be considered reliable. |
| Wardrobe, Profile, Archive, History, weather, and agenda | Code-healthy; live authenticated validation incomplete | Owner-scoped routes and automated tests pass. A dedicated synthetic authenticated account was not available, so no private customer account or browser storage was inspected. |
| V2 isolation | Healthy | Tests prove V2 evaluation is fail-closed, non-default, host-restricted, founder-authorized, cache-partitioned, and disconnected from Current Preview/Production routes. |
| Account privacy controls | Partial | Style Notes export/reset, private storage, and calendar disconnection exist. The public privacy page accurately states that full account deletion is not self-service. |

## Incident root causes

### Ask Curated

The immediate production failure is **OpenAI project quota exhaustion**, not a missing submit handler, authentication bypass, or silent browser reset.

Production function logs contain:

- `POST /api/recommendations/[id]/follow-up`
- OpenAI response status `429`
- provider code `insufficient_quota`
- affected project identifier was logged by the provider SDK

The client already routes Enter, suggested corrections, and the submit button through one state machine. It preserves the customer’s language on failure and prevents duplicate submissions. The API had been collapsing the provider failure into a generic message, obscuring the actionable cause.

### Travel

Travel’s AI route uses the same `getOpenAI()` client, `OPENAI_API_KEY`, `OPENAI_MODEL`, and provider project as Ask Curated. The confirmed exhausted shared quota is sufficient to make Travel AI unavailable. Travel previously:

- persisted the customer’s message before the AI call;
- returned a generic `503` for quota, timeout, and provider availability failures;
- cleared the follow-up composer before success;
- had no explicit retry action.

This created a trust gap: the request was often safely retained, but the interface did not explain the dependency failure or provide a dependable recovery action.

### Shared dependency

Ask Curated, Travel, Personal Shopper, wardrobe photo analysis, photo checks, and garment standardization depend on the same OpenAI project. They therefore share a provider-capacity blast radius. The code has timeouts and limited retries, but it does not have a separate provider circuit breaker, capacity monitor, or service-specific quota allocation.

## Environment and configuration findings

No secret values were printed, copied into this report, or modified.

| Variable group | Production | Current Preview | Finding |
| --- | --- | --- | --- |
| Public Supabase URL/key | Present | Present | Base authentication can initialize in both. |
| `SUPABASE_SERVICE_ROLE_KEY` | Present | Missing | Preview admin-backed/server-only operations are configuration-incomplete. |
| OpenAI key/model | Present | Present | Both environments can reach the same provider dependency; capacity remains the blocker. |
| Google Calendar client credentials | Present | Missing | Preview Google Calendar cannot be configured equivalently. |
| Calendar encryption/HMAC keys | Present | Missing | Preview cannot safely persist or resolve calendar credentials. |
| Site URL / OAuth callback configuration | Present | Missing | Preview OAuth callback behavior is not environment-complete. |
| Founder diagnostics flags | Absent | Present | Correct separation: diagnostics are Preview-only. |

The older Preview deployment queried had no retained error entries in the available Vercel window. This does not negate the configuration finding: the missing required variables are deterministic gaps.

## Capability inventory

| Capability | Route/surface | Authentication and privacy boundary | Operational assessment |
| --- | --- | --- | --- |
| Sign in, sign up, confirmation, sign out | `/auth/*` | Supabase session; safe internal redirect validation | Public surface verified reachable; private sign-in was not performed. |
| Dress My Day agenda and recommendations | `/today`, `/api/daily-*` | Current-user server checks and owner-scoped data | Automated workflow coverage passes. Live private E2E deferred. |
| Ask Curated follow-up | `/api/recommendations/[id]/follow-up` | Authenticated owner lookup, request-origin protection, rate limit | Provider quota incident confirmed. Local failure classification improved. |
| Mark “I wore this” | `/api/recommendations/[id]/wore` | Authenticated owner access | Automated history and availability tests pass. |
| Wardrobe CRUD and photos | `/closet`, `/api/closet-items/*` | Authenticated ownership, private bucket, signed URLs, upload validation | Automated validation/storage contracts pass. |
| Garment analysis and standardization | wardrobe AI routes | Server-side OpenAI; private media | At risk from shared quota. |
| Style Archive / outfit archive | `/style-archive`, `/api/outfits/*` | Owner-scoped access | Automated create/edit/delete and linking behaviors covered. |
| Wardrobe History | `/history` | Owner-scoped data and private media | Automated fit-check transfer and history tests pass. |
| Profile and Style Notes | `/profile`, `/api/profile`, `/api/style-profile` | Authenticated owner access; learning off by default; export/reset | Automated validation and cross-user tests pass. |
| Personal Shopper | `/personal-shopper`, `/api/personal-shopper/*` | Authenticated owner conversations; four-hour active window | Shared quota blocks analysis; quota-specific customer response already exists. |
| Travel | `/packing`, `/api/packing/*` | Authenticated owner conversation; itinerary validation | Shared quota incident; local retry and truthful failure handling added. |
| Google Calendar | `/api/calendar/*` | Read-only scopes, server-held encrypted token, owner access | Production configured; Preview configuration incomplete. |
| iCal/ICS | calendar routes | Encrypted URL, HTTPS-only, SSRF/IP/redirect/size/timeout controls | Security tests pass; Preview key configuration incomplete. |
| Weather and places | `/api/weather`, `/api/places/*`, `/api/geocode` | Server routes; bounded inputs | Automated weather and address behavior passes. |
| Founder diagnostics | `/internal/recommendation-diagnostics` | Server-only founder allowlist and Preview flag | Correctly Preview-only and tested against founder/diagnostic mutation authority. |
| Privacy page | `/privacy` | Public, transparent disclosures | Accurately discloses self-service account deletion gap. |

## Security and privacy review

### Passing controls

- Customer APIs use authenticated current-user resolution and owner-scoped repositories.
- Private images use a private storage bucket and short-lived signed URLs.
- Image and itinerary uploads have MIME/type and size validation.
- Google tokens and ICS URLs are server-side and encrypted at rest.
- ICS fetching has HTTPS-only enforcement, private-network blocking, redirect validation, timeout, response-size, and content validation.
- OAuth uses narrow read-only calendar scopes.
- Mutation requests have origin checks; state-changing AI routes have rate limits.
- V2 customer memory tests cover cross-user denial, RPC-only mutation, revisioning, restoration, and fail-closed activation.
- Founder and diagnostic actors cannot create customer corrections or change recommendation results.
- No private customer data or saved browser sessions were used during this audit.

### Open issues

1. **P1 — Preview environment drift:** missing service-role and calendar secrets prevent parity and can produce misleading Preview failures.
2. **P1 — AI provider capacity is a single shared dependency:** quota exhaustion affects several customer promises at once.
3. **P2 — Rate limiting is process-local:** the in-memory limiter is useful but not globally consistent across serverless instances.
4. **P2 — Full account deletion is not self-service:** accurately disclosed, but remains incomplete relative to the brand and privacy specifications.
5. **P2 — No controlled synthetic authenticated E2E identity:** private workflows cannot be continuously validated without touching real customer data.
6. **P2 — Migration execution is operationally manual:** versioned migrations exist, but the release process does not expose a clearly automated, isolated migration gate.
7. **P3 — Follow-up regeneration coupling:** a persisted correction can succeed and a later regeneration can fail; customer-facing state should continue distinguishing “memory saved” from “new looks generated.”

## Narrow reliability fixes completed locally

No fixes were deployed.

1. Added one safe OpenAI failure classifier for quota exhaustion, transient throttling, timeouts, and general provider unavailability.
2. Ask Curated now returns an actionable, privacy-safe error code/message instead of hiding confirmed quota exhaustion behind a generic failure.
3. Travel now distinguishes an expired session from provider unavailability.
4. Travel now states that a persisted request has been kept and never exposes provider internals.
5. Travel follow-up text is restored after failure.
6. Travel exposes a clear retry action that does not duplicate the already-persisted customer message.
7. Added focused tests for provider-failure classification and non-disclosure.

These changes improve honesty, continuity, and customer agency. They do **not** create an AI fallback that pretends to have analyzed a request, and they do not change recommendation scoring or V2 behavior.

## Issue register

| Priority | Issue | State | Required next action |
| --- | --- | --- | --- |
| P0 | None found in authentication/ownership that justified emergency destructive action | Closed for this audit | Maintain monitoring and synthetic E2E coverage. |
| P1 | OpenAI project quota exhausted | Open external dependency | Restore project capacity/billing limit, then run synthetic Ask, Travel, Personal Shopper, and photo-analysis smoke tests. |
| P1 | Preview missing server-only Supabase/calendar configuration | Open configuration | Add Preview-scoped values through the approved secret manager; never copy from chat or commit them. Validate on an isolated Preview deployment. |
| P2 | No synthetic authenticated E2E account | Open process | Create a non-customer test identity with synthetic wardrobe/events and explicit cleanup rules. |
| P2 | Distributed rate limiting absent | Open architecture | Move high-risk limits to a shared store before broader usage. |
| P2 | Account deletion not self-service | Open product requirement | Design and implement audited deletion across auth, database, media, calendars, and derived memories. |
| P2 | Manual migration gate | Open release engineering | Add an isolated migration dry-run and security suite to release checks. |
| P3 | Ask correction success and outfit-regeneration failure can be clearer | Partially mitigated | Preserve separate states and provide a regeneration-only retry. |

## Verification results

| Check | Result |
| --- | --- |
| ESLint | Passed |
| TypeScript (`tsc --noEmit`) | Passed |
| Automated tests | **245 passed, 0 failed** |
| Next.js production build | Passed; 43 application routes generated |
| Public Production sign-in render | Passed |
| Production error-log inspection | Passed; quota root cause confirmed |
| Preview error-log inspection | No retained errors in queried older deployment |
| Authenticated live E2E | Deferred; no synthetic credential was available and real customer data was out of scope |
| Mobile live authenticated E2E | Deferred for same privacy-safe credential requirement |

## Brand-alignment check

The local fixes strengthen the private-style-house promise:

- **Discretion:** provider internals and secrets stay server-side.
- **Hospitality:** errors say what happened in calm, customer-readable language.
- **Continuity:** persisted customer requests are not discarded.
- **Agency:** retry is explicit; the app does not falsely claim that AI analysis occurred.
- **Honest uncertainty:** provider unavailability is stated rather than covered with fabricated guidance.
- **Restraint:** no new engagement mechanism, marketplace behavior, recommendation scoring, or V2 capability was introduced.

## Authorization confirmations

- Production behavior remains unchanged.
- Current Founder Preview was not modified or replaced.
- V2 Evaluation remains disabled and isolated.
- No production or Preview deployment was created.
- No migration was run.
- No environment variable or secret was changed.
- No private customer data, saved login session, browser storage, or credentials were inspected.
- No recommendation scoring, recommendation philosophy, or scenario-specific behavior was changed.

## Recommended recovery order

1. Restore OpenAI project capacity and verify the configured project is the intended production project.
2. Run synthetic smoke tests for Ask Curated, Travel, Personal Shopper, wardrobe analysis, and photo checks.
3. Correct Preview server-only environment parity and redeploy **Preview only** after authorization.
4. Establish the synthetic authenticated E2E identity and automate desktop/mobile critical journeys.
5. Address distributed rate limiting, migration automation, and self-service account deletion as planned reliability/privacy work.

