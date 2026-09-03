# Recommendation Architecture V2 — Founder Evaluation Readiness

## Current state

The isolated V2 implementation is prepared for a future Founder-only V2
Evaluation activation. It remains disabled and has not been deployed.

## Evaluation results

### Founder Validation Suite

Ten universal synthetic scenarios pass through the governed sequence:

`Context → Dressing Posture → Personal Outfit Memory → Personal Outfit
Directions → Direction-led Retrieval → Restrained Composition → Hard
Validation → Stylist Adjudication → Consultation`

The scenarios cover an outdoor concert, dinner with friends, casual lunch,
property tour, travel day, date night, Saturday shopping, business-casual
meeting, outdoor brunch, and rain. The school-volunteering acceptance fixture
is an additional release-blocking regression.

### Broader customer fixtures

The suite uses distinct synthetic customer owners and verifies:

- identical wardrobes with different profiles produce different directions;
- no profile produces neutral behavior;
- low-confidence inference cannot create a hard exclusion;
- cross-customer wardrobe access fails closed;
- corrections and suppressions remain owner-scoped; and
- Founder, Product, diagnostic, test, and connected-service evidence cannot
  mutate customer memory.

### Isolated Supabase security

The Phase 1 migration passed 10 of 10 checks in isolated project
`rawqgzfkwzzjopxbedvt` using synthetic data. Live Supabase Auth/RLS, RPC-only
mutation, atomic auditing, rollback, immutable history, restoration,
supersession, revision increments, event ownership, direct-write denial, and
service-role boundaries all passed.

## Evaluation access controls

The fail-closed access resolver requires all of the following:

- an explicit Product activation authorization in the evaluation-only
  entrypoint;
- `RECOMMENDATION_V2_EVALUATION_ENABLED=true`;
- a non-Production deployment;
- an exact isolated-host allowlist match;
- an authenticated Founder email allowlist match; and
- the architecture-versioned `recommendation-v2-evaluation` cache partition.

It denies Production and unlisted hosts even when the environment flag is set.
Founder access exposes diagnostics only; it cannot alter a recommendation
result or create Founder-specific recommendation behavior.

## Safe activation instructions

These steps are instructions for a later, separately authorized activation.
They have **not** been performed:

1. Product authorizes Founder-only V2 Evaluation activation.
2. Create an isolated Vercel Preview deployment; do not promote or alias it to
   Current Preview or Production.
3. Set `RECOMMENDATION_V2_EVALUATION_ENABLED=true` only on that deployment.
4. Set `RECOMMENDATION_V2_EVALUATION_EMAILS` to the approved Founder account.
5. Set `RECOMMENDATION_V2_EVALUATION_HOSTS` to that deployment’s exact host.
6. Set the evaluation-only entrypoint’s `activationAuthorized` input to true.
7. Verify the V2 label, versioned cache partition, authenticated allowlist, and
   kill switch before any recommendation is shown.
8. To disable immediately, set
   `RECOMMENDATION_V2_EVALUATION_ENABLED=false` and redeploy the isolated
   Preview. Current Preview and Production require no rollback because they do
   not import or consume V2.

## Deferred criteria

- Actual Founder wardrobe review is intentionally deferred until Product
  authorizes evaluation access.
- Live multi-customer customer-data evaluation is intentionally deferred; the
  completed suite uses synthetic data only.
- V2 is not authorized to replace Current Preview.
- Production shadowing, cohort rollout, and legacy retirement remain
  unauthorized.

## Release confirmation

- Current Preview remains available and unchanged.
- Production behavior remains unchanged.
- V2 Evaluation remains disabled.
- No Founder-specific recommendation behavior exists in universal logic.
- No deployment has occurred.
