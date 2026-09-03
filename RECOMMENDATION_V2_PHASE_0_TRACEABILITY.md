# Recommendation Architecture V2 — Phase 0 Traceability

Status: revised Phase 0 for Product review. Phase 1 is not authorized and has not begun. Current Preview and Production remain unchanged. No deployment is included.

## Remaining Phase 0 corrections

| Product requirement | Executable contract or registry | Enforced validation |
|---|---|---|
| Govern every decision-critical semantic | `GOVERNED_SEMANTICS` in `taxonomy.ts`, taxonomy `v2.2.0` | Occasion, tone, practical purpose, instruction, quality, comfort, accessibility, material, garment genre, silhouette, proportion, palette, reservation, and plausibility values must resolve to versioned registry identifiers |
| Preserve unresolved customer language without treating it as policy | `UnresolvedCustomerLanguage` | Requires `display-and-audit-only` and `mayDriveDecision: false`; runtime validation rejects unresolved language that attempts to drive a decision |
| Identify exact upstream artifacts | `ArtifactRef` `v2.2.0` | Requires artifact ID, owner, request, schema version, artifact revision, and generated timestamp; validators reject owner, request, schema, or identity mismatch |
| Make adjudication replayable | `StylistAdjudicationDecision` `v2.2.0` | References the exact Brief, Event Policy, Posture, Directions, Candidate Looks, Correction State, Suppression State, and Memory Snapshot |
| Enforce authority/source relationships | `validateEvidenceRef` and its complete authority/source matrix | Rejects Founder/Product/test authority disguised as customer evidence, inference disguised as explicit customer authority, customer authority without customer ownership, institutional evidence carrying customer ownership, and cross-customer evidence |
| Prevent institutional evaluation from mutating a customer | `validateCustomerState` | Corrections and suppressions accept only customer-current or customer-durable authority with matching ownership |
| Require the complete adjudication record | `CHECK_DEFINITIONS` | Declares every required deterministic and comparative check, its collection, its condition, and centrally owned failure behavior |
| Prevent writer-selected disqualification | `CheckResult` plus `CHECK_DEFINITIONS` | `CheckResult` has no disqualifying field; runtime validation rejects an injected override |
| Require positive proof before recommendation | `validateChecks` | Rejects missing, duplicate, unsupported, or misclassified checks; failed governed checks; consequential unknowns; missing selected-look references; incomplete challenger comparisons; and unsupported explanation facts |
| Keep uncertainty consequence-aware | `uncertainty` check definition and reason codes | Low-consequence uncertainty is not intrinsically disqualifying; `consequential-unknown` prevents recommendation |
| Separate adjudication outcomes | `RecommendDecision`, `ReviseDecision`, `AskDecision`, `AbstainDecision` | Recommend requires a passing selected candidate; revise requires an exact candidate and governed revision operations; ask requires one viability-changing focused question; abstain requires a governed non-approved reason; outcome-irrelevant fields are rejected |
| Ground customer-facing explanation | `ExplanationFact` | Every explanation fact requires supporting evidence references |
| Keep caches safe across revisions and customers | `CacheRevisionIdentity` | Cache namespace varies with customer, request, architecture, taxonomy, contract, agenda/context, weather, Style Profile, wardrobe evidence, corrections, suppressions, memory, engine, and feature flag |
| Preserve Current Preview and Production | `RECOMMENDATION_CONTINUITY_VERIFICATION` and route source scan | V2 imports are absent from application routes, V2 Evaluation is disabled, and Phase 1 persistence remains explicitly deferred |

## Contract relationship chain

```text
Customer Dressing Brief (exact artifact)
        + Event Policy (exact artifact)
                    ↓
          Dressing Posture
                    ↓
  Personal Outfit Direction(s)
   + Correction State
   + Suppression State
   + Memory Snapshot
                    ↓
        Candidate Look(s)
                    ↓
       Stylist Adjudication
```

Each arrow is represented by an exact, revision-bearing `ArtifactRef`, not merely a schema-version string.

## Phase boundary

Phase 0 defines schemas, governed taxonomy, validation, schema registry, artifact/evidence provenance, cache identity, tests, and continuity evidence only. It does not persist customer corrections or suppressions, activate V2 routing, enable Founder V2 Evaluation, alter recommendation results, begin Phase 1, or deploy code.
