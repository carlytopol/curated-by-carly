# Recommendation Architecture V2 — Phase 1

Status: complete in repository; not deployed; not connected to Current Preview or Production.

## Disposable database verification

- Environment: PGlite 0.4.1, disposable in-memory PostgreSQL.
- Migration: `supabase/recommendation-v2-phase-1.sql`.
- Result: 17 of 17 security and lifecycle gates passed.
- Data: synthetic customers only.
- Isolation: no credentials, shared database, Current Preview, or Production.
- Lifecycle: the database is discarded when verification exits.

The suite covers clean application, reapplication safety, schema and RLS,
owned-customer RPCs, two-customer isolation, direct-write denial, audit
tampering denial, fail-closed similar-context matching, authorized-service
atomicity and rollback, immutable history, restoration and supersession,
idempotency, revision/cache ownership, civil dates, time zones, and event
ownership.

## Authority and source matrix

Only `customer-current` and `authorized-customer-service` may mutate durable customer memory. Customer service is a governed actor acting for one named customer, with actor identity, authorization identity, reason, confirmation channel, target, and idempotency key. Its mutation and audit record commit in one database transaction.

Connected calendar, weather, and venue services provide contextual evidence only. Product, Founder, diagnostics, automated tests, inference, and connected services cannot create preferences, corrections, or suppressions. There is no table-write grant for these actors and no Founder or diagnostic mutation function.

## Canonical correction contract

A correction preserves original customer language beside exactly one governed directive:

- current intention or outfit direction;
- event context;
- formality floor and ceiling;
- ceremony allowance;
- effort;
- comfort, coverage, footwear, carrying, or accessibility;
- garment fact or garment occasion role;
- piece replacement or removal;
- item instruction, quality instruction, or outfit relationship.

Garment facts remain distinct from preferences. A fact changes canonical item truth only through the governed fact directive; it is not silently converted into a durable style preference.

## Scope and confirmation

### Today only

Uses a real civil date, a canonical IANA timezone, fixed-at-creation timezone behavior, and an optional owned Daily Event. A later profile-timezone change never moves the memory to another day.

### Similar contexts

Uses `similar-context-matcher.v2.2.0` with a governed occasion plus day character and/or social stakes. It remains inactive unless the target customer confirms:

- the precise plain-language description;
- the matcher version shown;
- their identity;
- the confirmation timestamp.

“Similar occasions” and “similar contexts” are intentionally invalid because they do not disclose what will match. An unclear scope fails without persistence so the product can offer Today only or ask one focused scope question.

### Until restored

Applies durably until the customer restores it.

## Immutability, revision, and restoration

Original language, normalized directive, scope, authority, item, and provenance columns are immutable. Restoration changes only lifecycle fields. Editing creates a new row linked by `supersedes_record_id`; the prior row becomes `superseded`. Every committed lifecycle change increments only the owning customer’s correction or suppression revision for architecture-versioned cache invalidation.

Direct `INSERT`, `UPDATE`, and `DELETE` privileges are revoked from authenticated and service roles. Customer and service mutations pass through separate `SECURITY DEFINER` transaction boundaries. Restoration and supersession require the target record to belong to the same customer.

## Persistence truth and failure behavior

Curated confirms memory only after a repository commit. A failed write preserves the customer’s exact text, is retryable when appropriate, and says that nothing changed. An authorized service mutation cannot exist without its linked audit row; any audit, ownership, scope, or mutation failure rolls the transaction back.

## Current Preview and V2 compatibility

The compatibility contract defines a future read-only exact-day projection, but Current Preview does not consume or display it. Durable V2 scopes remain V2-only. No application route imports Phase 1, no V2 Evaluation mode is active, and no recommendation behavior has changed.

## Verification status

Passed locally:

- TypeScript contract validation;
- authority/source separation;
- Founder, Product, diagnostic, inference, and test denial;
- confirmed similar-context matching;
- date/timezone validation;
- complete directive-family coverage;
- failure truth and preserved input;
- suppression restoration and revision behavior;
- compatibility isolation;
- static SQL checks for RPC-only mutation, immutable evidence, atomic audit linkage, ownership checks, and write-grant removal.

The isolated PostgreSQL execution gate is complete. There are no deferred
database assertions.

## Isolated Supabase security gate

- Environment: isolated Supabase project `curated-v2-synthetic-security`
  (`rawqgzfkwzzjopxbedvt`).
- Migration: `supabase/recommendation-v2-phase-1.sql`.
- Result: 10 of 10 live Auth, RLS, RPC, transaction, and service-boundary gates
  passed.
- Data: two synthetic customers and synthetic events only.
- Isolation: the project is distinct from Current Preview and Production; no
  Production credentials or customer data were used.
- Secret handling: the temporary local environment file was deleted after the
  run and the process environment was cleared.

The live suite verified two authenticated customer sessions, JWT-derived
ownership, cross-customer fail-closed behavior, owner-only reads, anonymous and
direct-write denial, RPC-only mutation, atomic customer-service auditing,
transaction rollback, immutable evidence, restoration and supersession,
customer-scoped revision increments, event ownership, and service-role
boundaries.

## Brand alignment

Confirmations state what Curated understood, the exact scope, how long it remains active, and where it can be restored. Failure language is candid and discreet. Nothing is presented as remembered before durable persistence, and no institutional evidence is allowed to impersonate customer preference.
