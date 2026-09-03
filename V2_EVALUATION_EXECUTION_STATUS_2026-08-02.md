# Main-application Founder V2 — Same-day execution status

Prepared August 2, 2026. This supersedes any schedule in
`V2_EVALUATION_GATE_REPORT_2026-08-06.md` that treated August 6 as a hold date.
The Founder has superseded the permanent separate-application model with one
main Curated application and server-side, account-scoped engine routing. The
Founder has authorized immediate completion and activation for only the
authenticated Founder account after every applicable gate passes. Current
Preview remains available and every other Production customer remains on the
currently authorized engine.

## Executive status

The universal V2 recommendation pipeline and its core authority contracts are
implemented and tested in isolation. The main-app server routing contract now
exists and fails closed: it requires a verified immutable customer UUID,
dormant-code enablement, explicit Founder-activation authorization, assignment,
and clear global and per-account kill switches. It is not yet connected to the
main recommendation route, so V2 remains unreachable and no customer behavior
has changed.

Activation is blocked by integration evidence, not by an arbitrary date:

1. the authenticated main recommendation route selecting V2 only from the
   server-side immutable customer assignment;
2. a proven owner-scoped, read-only bridge to canonical wardrobe and approved
   Profile data;
3. isolated owner-scoped persistence for V2 corrections, suppressions,
   recommendation artifacts, history, and cache revisions;
4. signed-in browser and database-boundary verification of that complete path;
5. global and per-account kill-switch, rollback, and legacy-customer continuity
   exercises.

Engineering has begun this integration work. V2 Evaluation remains disabled
until those gates pass.

## Gates already passing

| Gate | Evidence | Status |
|---|---|---|
| Universal V2 pipeline order | Dressing Posture is constructed before direction-led retrieval; restrained composition, hard validation, and Stylist Adjudication follow | Pass in automated tests |
| No forced weak options | Composition returns fewer options when distinct foundations or suitable support pieces do not survive | Pass in automated tests |
| Suppression enforcement in the isolated engine | Active suppressions are resolved before retrieval and checked again in hard validation | Pass in automated tests |
| Owner isolation in pure contracts | Cross-owner wardrobe, Profile, memory, and adjudication references fail closed | Pass in automated tests |
| Main-app account-routing contract | Verified immutable customer ID, independent code/authorization gates, assignment, global kill, per-account kill, and account/architecture/engine/flag cache partition | Pass in automated tests |
| Isolated Supabase Phase 1 security proof | Prior synthetic run in isolated project `rawqgzfkwzzjopxbedvt` passed Auth/RLS, RPC-only mutation, atomic audit, rollback, immutable history, restoration, revision, ownership, direct-write denial, and service-role checks | Previously passed; must be rerun for the integrated candidate |
| Universal quality fixtures | Founder suite, school-volunteering gate, date-night suppression semantics, neutral/no-Profile behavior, multi-customer fixtures | Pass in automated tests |
| Current Preview continuity | V2 is not selected by current application routes | Preserved |
| Customer isolation | Unassigned and invalid identities resolve to legacy; browser-shaped identity cannot select V2 | Pass in routing tests |
| Production behavior | No V2 deployment, traffic, route, assignment, or database migration | Preserved |

On August 2, 2026, the prior repository test command completed with **258
passed, 0 failed**. The new account-routing suite adds **6 passing tests** and
TypeScript passes. A fresh full-suite result is still required after the
remaining integration is complete.

## Remaining gates and exact work

| Remaining gate | Exact work | Owner | Founder decision needed? |
|---|---|---|---|
| Main route integration | Resolve the signed-in Supabase `sub` server-side and dispatch to V2 only when all routing gates permit it; never accept engine choice or identity from the browser | Engineering | No |
| Canonical read-only bridge | Resolve the signed-in canonical owner; read only that owner's wardrobe and approved Profile projection through existing RLS; prevent all canonical mutations from the V2 surface | Engineering / Data | No |
| Separate V2 artifacts | Add owner-scoped V2 persistence for recommendation requests, Dressing Posture, directions, outcomes, supported explanations, correction/suppression revisions, and architecture-versioned cache keys; do not write these into legacy recommendation state | Engineering / Data | No |
| Suppression lifecycle proof | Create, enforce, restore, increment revisions, invalidate caches, regenerate, and prove absence from primary, alternatives, consultation, cached reads, and explanations | Engineering / Security | No |
| Signed-in E2E | Run positive Founder flow plus negative owner, assignment, stale-cache, restored-suppression, and cross-customer synthetic tests in the main app | Engineering / QA | Founder sign-in may be the one final action |
| Kill switch | Disable the Founder account and global gates independently and prove requests return to legacy without mutating canonical or V2 data | Engineering / Release | No |
| Rollback | Record the deployment ID and rehearse per-account disablement and artifact rollback without changing canonical customer data | Engineering / Release | No |
| Current Preview continuity | Re-run its authentication and primary workflow smoke tests while V2 Evaluation is active on its isolated host | Engineering / QA | No |

## What can be tested today

Today, Engineering can continue testing the universal V2 contracts, synthetic
Founder scenarios, suppression lifecycle, and owner-isolation behavior locally
and against the isolated Supabase project. The Founder should **not** yet be
given an ordinary Preview link for recommendation-quality testing because the
authenticated canonical-data bridge and isolated artifact persistence are not
complete.

If the identity/persistence integration and all negative security tests pass in
the same release candidate, the labelled Founder-only environment will be sent
immediately; August 6 is not a hold date.

## Earliest technically responsible activation

Consolidation does not introduce a new fundamental blocker or move the current
estimate later. The earliest responsible Founder activation remains **when the
remaining focused integration and security gates pass, currently estimated by
August 4, 2026 and sooner if completed sooner**, provided:

- the owner-scoped V2 persistence migration passes in an isolated Supabase
  environment with synthetic accounts;
- the integrated security suite passes without remediation; and
- the signed-in browser flow exposes no ownership, persistence, or rollback
  defect.

If any owner-isolation or persistence test fails, activation moves by the time
needed to correct and rerun that gate; it will not be waived. Engineering will
notify Product immediately when the gates pass rather than waiting for August
6.

## What prevents a customer release today

A customer rollout is not safe today because the authenticated integrated V2
path has not yet been proven, actual customer recommendations have not passed
Founder review in the isolated environment, broader multi-customer browser and
database tests have not run against the integrated build, and rollback has not
been rehearsed. Default Preview replacement and Production rollout remain
unauthorized.

The earliest customer cohort date cannot responsibly precede Founder-only
evaluation, real recommendation review, integrated multi-customer security
evidence, and explicit Product authorization. With clean gates and rapid
Founder feedback, the earliest small cohort is **the week of August 10, 2026**;
this is an evidence-based earliest window, not a promised release date.

## Brand-alignment check

The one-application model strengthens Curated as one private style house while
keeping rollout discreet and owner-scoped. Founder diagnostics may reveal
decision artifacts and provenance but cannot alter the universal result or
introduce Founder-specific styling behavior.
