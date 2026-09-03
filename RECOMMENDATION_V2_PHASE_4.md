# Recommendation Architecture V2 — Phase 4 Completion Record

## Status

Phases 4A, 4B, and 4C are complete for isolated V2 evaluation. No application
route consumes them and nothing has been deployed.

## Hard Validation boundary

Only complete, typed looks may cross validation. The boundary checks:

- customer ownership and garment availability;
- active customer suppressions;
- valid foundations and unique garment roles;
- explicit customer prohibitions;
- confirmed venue or activity requirements;
- safety and consequential practical requirements; and
- required footwear where the lived day requires it.

Rejected looks receive structured reason codes and never reach recommendation
copy or Stylist Adjudication. Unknown evidence remains conditional unless the
unknown fact would make the recommendation irresponsible.

## Stylist Adjudication

Final selection authority is a bounded comparative adjudicator over complete,
validated looks. Aggregate cohesion, polish, burden, and confidence remain
diagnostics; they cannot independently select the recommendation.

The adjudicator:

- receives the same Posture, Styling Brief, memory snapshot, and evidence for
  every look;
- cannot add garments, change roles, relax a policy, or persist memory;
- must judge every validated look exactly once;
- must use unique positive ranks;
- may recommend, request a revision, ask one consequential question, or
  abstain; and
- fails closed when its result references an unknown look, omits a valid look,
  or returns duplicate or invalid judgments.

## Consultation and correction integration

Typed messages, Enter, the submit button, and suggested corrections use one
canonical submission service. The service:

- preserves customer text until the durable command succeeds;
- prevents duplicate submissions through idempotency;
- applies today-only corrections to the rebuilt request immediately;
- requires explicit confirmation for durable similar-context or
  until-restored memory;
- shares the same correction meaning with Profile; and
- reports loading, success, retryable failure, and persistence truth without
  pretending that a failed write was remembered.

## Acceptance evidence

Tests cover structural rejection, ownership, availability, suppression,
explicit prohibitions, manageable and consequential unknowns, no score rescue,
adjudication outranking aggregate diagnostics, invalid adjudicator responses,
typed/Enter/suggested correction paths, expired sessions, API persistence
failures, preserved drafts, correction rebuilding, and Founder/diagnostic
mutation denial.

The mandatory July 29 school-volunteering fixture verifies that the suppressed
Roland Garros shirt never appears, formal heels are rejected, heat, walking,
coverage, comfort, and restraint shape the direction, and the engine returns
one independently qualified look rather than padding the result with weak
alternatives.

## Brand alignment

The boundary favors candid abstention or one useful question over a polished
explanation for a weak outfit. Corrections remain legible, reviewable, scoped,
and customer-controlled.

## Release state

- Founder-only V2 Evaluation: disabled.
- Current Preview: unchanged and available.
- Production: unchanged.
- Deployment: none.
