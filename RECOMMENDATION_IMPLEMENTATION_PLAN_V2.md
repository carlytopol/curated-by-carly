# Recommendation Architecture V2 — Implementation Plan

**Status:** Approved with Product conditions incorporated; Phases 0–2 authorized, Production deployment prohibited  
**Source of truth:** `RECOMMENDATION_QUALITY_ROADMAP.md` dated July 29, 2026  
**Architecture contract:** `RECOMMENDATION_ARCHITECTURE_V2.md`  
**Deployment:** Broad Production enablement is prohibited. Product has authorized dormant V2 code in the one main Curated application and activation only for the authenticated Founder account after all applicable safety, isolation, persistence, quality, and rollback gates pass.

## 0. Development continuity and release boundary

- Keep the existing Founder Preview usable throughout V2 development.
- Do not replace Current Preview with an incomplete V2 phase.
- Carry V2 inside the main application without exposing an engine selector to the browser.
- Route by verified immutable customer ID on the server only. Require independent dormant-code, Product-authorization, account-assignment, global-kill, and per-account-kill gates.
- Keep the temporary separate Founder Preview available for continuity until main-app activation and rollback are verified; then retire it deliberately.
- Founder V2 must remain safely disableable per account and globally, and must not reduce legacy availability for another customer.
- Isolate caches and recommendation artifacts by customer, architecture, engine, and contract version.
- Require an explicit compatibility strategy before corrections or suppressions are shared across engines.
- Ensure a V2 failure cannot block Wardrobe, Profile, Calendar, Travel, or current Dress My Day.
- Keep ordinary Production on the exact customer experience with no Founder-specific recommendation behavior.
- Treat Founder diagnostics as observational only.
- Preserve one universal V2 architecture; account rollout controls access, never styling behavior.

## 1. Delivery decision

Implementation will replace the governing recommendation path without incrementally tuning the current engine.

The migration is contract-first and shadow-first:

1. approve contracts and fixtures;
2. build Dressing Posture independently of garments;
3. build Personal Outfit Memory and concept-first composition;
4. build comparative Stylist Adjudication and correction continuity;
5. run shadow evaluation;
6. integrate dormant V2 behind server-only account routing in the main application;
7. activate only the authenticated Founder account after its complete gates pass;
8. leave every other customer on the currently authorized engine until separately approved.

Founder account activation does not authorize another account. Limited customer cohorts, default replacement, and general rollout each require separate Product authorization.

The current Production engine remains frozen. Existing evidence and diagnostics work may continue only as supporting infrastructure.

## 2. Dependencies

### Product dependencies

- approved July 29 Recommendation Quality Roadmap;
- approved contract semantics for Dressing Posture, Personal Outfit Direction, and Stylist Adjudication;
- approved correction scopes and memory language;
- approved founder evaluation scenarios and quality rubric;
- explicit decision on when one option is preferable to multiple options.

### Data dependencies

- `DailyAgenda` and event transitions;
- event-time weather evidence and confidence;
- narrow Event Policy evidence;
- owner-scoped wardrobe and garment evidence;
- Style Profile and Personal Styling Brief;
- Wardrobe Evidence Summary;
- outfit/wear history;
- correction and feedback provenance;
- availability, laundry, repair, loaned, and reserved status;
- Outfit Knowledge Graph foundation.

### Technical dependencies

- Supabase authentication and RLS;
- versioned recommendation records;
- diagnostics persistence and founder-only inspector;
- idempotent route/service boundaries;
- structured AI output validation;
- feature flags for `frozen`, `shadow`, `preview`, and eventual `production`;
- evaluation fixtures with no unnecessary private data.

### Dependencies that must not become blockers

- exhaustive metadata completeness;
- a large worn-history corpus;
- three alternatives;
- an AI inference for every unknown field;
- shopping or retailer data.

Cold start and uncertainty are required product states.

## 3. Phase 0 — Contract finalization and schema registry

### Work

- Freeze current recommendation behavior and record Current Preview and Production engine manifests.
- Freeze the approved V2 contracts and governed taxonomy registry.
- Add runtime validation for operator-specific predicates and ordinal ranges.
- Record taxonomy and contract versions in every affected artifact.
- Preserve Founder and broader-customer fixtures as reproducible baselines.
- Inventory reusable services and deprecated selection paths.
- Define isolated architecture feature flags and cache namespaces with no user-visible behavior change.
- Document backward-compatible reads and V2 write isolation.

### Deliverables

- authoritative contract and schema-registry manifest;
- frozen baseline and Current Preview continuity manifest;
- engine disposition map;
- Founder and broader-customer evaluation corpus versions;
- feature-flag, cache-isolation, and rollback contracts.

### Acceptance criteria

- `RECOMMENDATION_ARCHITECTURE_V2.md` and the Roadmap are recorded as governing authorities.
- All decision-critical values use governed types or an explicit unresolved-evidence state.
- Formality ranges and preferred bands reject invalid orderings.
- Fragrance is structurally optional.
- Unknown genre or material does not become an automatic prohibition.
- Customer-defined predicates preserve original language and require normalized confirmation.
- Current Preview and Production behavior are unchanged and reproducible.
- Existing evidence enrichment remains user-scoped and does not overwrite confirmed facts.
- Deprecated paths are identified but not removed before the replacement path is proven.

## 4. Phase 1 — Authority, corrections, suppressions, and isolation

### Work

- Implement the authority model for customer corrections, canonical facts, inferred preferences, Product findings, tests, and diagnostics.
- Implement customer-owned scopes: Today, Similar contexts, and Until restored.
- Implement governed `ContextScopeMatcher` normalization and customer confirmation.
- Implement reviewable recommendation suppressions and restoration.
- Enforce server-side ownership, RLS, user-scoped caches, and cross-user isolation.
- Add compatibility projections between Current Preview and V2 without silently changing meaning.
- Keep V2 artifacts isolated by architecture and contract version.

### Tests

- authority and scope validation;
- correction and suppression round-trip;
- failed-normalization behavior;
- version and compatibility mismatch;
- ownership mismatch fails closed;
- cross-user cache and persistence isolation;
- diagnostic observation cannot mutate recommendation state;
- no hidden free-form mutation of canonical garment facts.

### Acceptance criteria

- Customer authority is distinct from Founder/Product evaluation authority.
- Corrections take effect immediately within confirmed scope or clearly report persistence failure.
- Active suppressions apply to primary, alternatives, regeneration, caches, consultation, and explanation.
- Failed normalization never silently broadens a scope.
- Cross-user access and cache-contamination tests are zero tolerance.
- Founder diagnostics cannot change recommendation results.
- Current Preview remains usable and existing recommendation behavior is unchanged.

## 5. Phase 2 — Customer Dressing Brief and normalization

### Work

- Implement the versioned `CustomerDressingBrief`.
- Preserve exact customer language beside governed normalized intent.
- Normalize comfort, coverage, carrying, footwear, desired impression, effort, and explicit item instructions.
- Attach confidence, provenance, authority, and correction scope to every normalized directive.
- Detect conflicts and consequential unknowns.
- Display a concise confirmation of what Curated understood.
- Provide neutral behavior for absent or incomplete profiles.

### Tests

- typed normalization and runtime validation;
- original-language preservation;
- explicit instruction versus inferred default;
- failed and ambiguous normalization;
- consequential versus manageable unknown;
- neutral behavior with absent or incomplete Profile;
- customer-readable confirmation;
- cross-user isolation.

### Acceptance criteria

- Original language is preserved and never silently rewritten as customer truth.
- Explicit current instructions outrank inferred defaults.
- Unknown evidence does not default to false.
- Failed normalization remains visible and cannot become a hidden veto.
- Sensitive or protected characteristics are not used as style shortcuts.
- Two customers with different explicit briefs remain isolated.
- Current Preview and Production recommendation behavior remain unchanged.

## 6. Phase 3A — Personal Outfit Memory

### Work

- Build a user-scoped memory projector over existing canonical evidence.
- Distinguish recommendations, confirmed wears, approvals, rejections, corrections, and exposure.
- Project known foundations, complete combinations, substitutions, contextual reservations, and comfort outcomes.
- Connect Outfit Knowledge Graph edges without making them recommendation authority.
- Add review, export, reset, and deletion boundaries.

### Tests

- cross-user isolation;
- recommended does not imply worn;
- worn does not imply enjoyed;
- skipped option is weak evidence;
- explicit correction outranks inferred behavior;
- occasion reservation remains context-scoped;
- one-time correction does not become durable;
- deletion removes projected memory;
- Profile answers remain separate from behavior.

### Acceptance criteria

- Every memory claim has provenance and confidence.
- The customer can distinguish what she said from what Curated inferred.
- Curated’s own exposure does not create self-reinforcing preference.
- No aggregate user fallback exists.
- Sparse history produces a valid, candid snapshot.

## 7. Phase 3B — Personal Outfit Directions and restrained composition

### Work

- Build a direction portfolio from Posture, Style Profile, Wardrobe Evidence, and Outfit Memory.
- Retrieve foundations against each direction rather than enumerating the wardrobe.
- Complete each foundation with candidate-relative shoes, layer, bag, and accessories.
- Make every optional role omissible.
- Prefer the simplest excellent completion.
- Permit fewer options when no materially distinct strong challenger exists.

### Tests

- known successful outfit remains preferred when appropriate;
- known dinner outfit is not generalized to errands;
- graphic tee reserved for errands;
- polished-casual vs casual vs polished;
- small wardrobe;
- no personal history;
- underused but profile-aligned item;
- unknown pockets as conditional rather than false;
- bag, jewelry, fragrance, and layer omitted when unnecessary;
- alternatives are materially distinct;
- incomplete direction cannot reach composition.

### Acceptance criteria

- No candidate generation starts from the full Cartesian product.
- Every direction explains personal plausibility before garment IDs.
- Every composed look traces to one direction.
- Support pieces are foundation-relative.
- Familiar excellent repeats may defeat novelty.
- Unknown evidence follows the consequence hierarchy.
- At least 90% of surfaced directions are judged personally plausible in the approved suite.

## 8. Phase 4A — Hard Validation boundary

### Work

- Retain structural, ownership, availability, safety, explicit venue, and explicit user vetoes.
- Remove posture and taste judgments from hard validation.
- Replace unknown-as-false behavior with explicit conditional evidence states.
- Ensure rejected looks never reach explanation or adjudication.

### Tests

- structural foundation validity;
- ownership and availability;
- explicit venue/security policy;
- explicit user prohibition;
- known safety failure;
- unknown garment fact;
- conditional viability;
- no score rescue.

### Acceptance criteria

- Every veto has one owning stage.
- Confirmed hard failure cannot be overridden.
- Unknown evidence does not create a veto unless the product contract defines an unacceptable safety risk.
- Rejected looks produce reason codes and no recommendation prose.

## 9. Phase 4B — Stylist Adjudication

### Work

- Build a bounded comparative adjudicator over complete validated looks.
- Supply the same Posture, Styling Brief, Memory snapshot, and evidence to every comparison.
- Implement the eight adjudication checks.
- Retain cohesion, polish, burden, and confidence only as diagnostics.
- Require challenger comparison when a plausible challenger exists.
- Support revise, ask, and abstain outcomes.
- Validate explanation claims against evidence.

### AI implementation boundary

- AI receives only bounded, user-scoped, validated look data.
- AI returns schema-validated decisions and reason codes.
- AI cannot add garments, change roles, alter facts, relax policy, or persist preferences.
- Deterministic code validates the AI result before it can be surfaced.

### Tests

- simpler excellent look defeats elaborate equal;
- technically valid but overdone look loses;
- personally characteristic look defeats generic look;
- practical burden changes the winner;
- one unnecessary piece is removed;
- challenger materially improves the recommendation;
- no challenger exists;
- consequential unknown asks one question;
- weak field abstains;
- score ordering disagrees with adjudication and adjudication wins;
- unsupported explanation claim is rejected.

### Acceptance criteria

- No aggregate score independently selects a primary.
- Every selected look has a recorded comparative decision.
- “Too dressy for the day” and “too much effort” are first-class decisions.
- The adjudicator can remove burden or request recomposition.
- Hidden chain-of-thought is not stored.
- Founder review rates at least 90% of surfaced primaries credibly stylist-approved.

## 10. Phase 4C — Consultation and correction

### Work

- Unify typed text, Enter, submit button, and suggested prompts through one service.
- Preserve current context and text until success.
- Apply corrections to current Posture and Directions immediately.
- Require explicit scope for durable memory.
- Use the same explicit-preference contract in Profile and Dress My Day.
- Add loading, success, retryable error, and persistence truth states.
- Make retries idempotent.

### Tests

- typed prompt;
- Enter submission;
- suggested prompt;
- expired session;
- API failure preserves text;
- duplicate submission prevention;
- current recommendation changes relevantly;
- today-only correction expires;
- similar-day correction remains scoped;
- canonical item correction updates garment evidence;
- failed save is not shown as remembered.

### Acceptance criteria

- At least 90% of corrections produce a visibly relevant next recommendation.
- The customer never re-enters known context.
- The interface states what changed and what will be remembered.
- Profile and Dress My Day share one durable correction meaning.

## 11. Phase 5 — Evaluation and Preview promotion

### Shadow evaluation

Run the new engine beside the frozen engine without customer exposure.

Required scenarios:

- appointments and errands;
- 90°F+ routine and social days;
- work plus movement;
- social non-formal;
- formal;
- travel;
- rain;
- multi-event transitions;
- small and sparse wardrobes;
- unknown critical facts;
- strong personal history;
- no personal history;
- correction and edit continuity.

### Release gates

1. **Posture credibility:** ≥90% approved before garments.
2. **Personal plausibility:** ≥90% of surfaced directions judged credible.
3. **Editorial authority:** no aggregate-score winner; simpler strong looks may win.
4. **Consultation trust:** editing and persistence pass end to end.
5. **Founder approval:** no technically valid but fundamentally implausible output in the approved suite.
6. **Broader customer quality:** approved multi-customer fixtures pass without Founder-style leakage or sensitive-characteristic shortcuts.

### Founder account activation in the main application

The authenticated Founder account may be routed to V2 in the main application when:

- its dependencies and phase acceptance criteria pass;
- applicable safety, customer-isolation, compatibility, and rollback checks pass;
- caches and artifacts are architecture-versioned;
- the capability is safely disableable;
- the routing decision is server-enforced from the verified immutable customer ID and cannot be selected or spoofed by the browser;
- independent global and per-account kill switches have been verified;
- all other accounts deterministically remain on their currently authorized engine;
- the temporary Founder Preview remains available until main-route rollback is verified; and
- only capabilities whose applicable gates passed are exposed.

The route must use the universal V2 engine. Founder diagnostics may expose evidence but may not alter the result.

### Default Preview replacement rule

V2 may not replace Current Preview or become the default Preview experience until:

- all applicable implementation phases pass;
- Founder Validation passes;
- broader multi-customer validation passes;
- Product reviews actual recommendations;
- all zero-tolerance gates pass;
- rollback is verified; and
- the Founder explicitly approves the completed Preview experience.

Production remains unchanged until a separate explicit authorization.

The release sequence is mandatory: dormant main-app integration → Founder account activation → Founder Validation → Product review of actual recommendations → broader multi-customer evaluation → Production shadow → explicitly authorized small cohort → explicitly authorized gradual expansion → explicitly authorized legacy retirement. Any zero-tolerance failure stops rollout.

## 12. Estimated implementation order

| Order | Work | Depends on | Estimated effort |
| ---: | --- | --- | --- |
| 0 | Contract finalization, schema registry, continuity and baseline manifests | approved authority package | 4–6 days |
| 1 | Authority, corrections, suppressions, compatibility, and isolation | Phase 0 contracts | 1.5–2.5 weeks |
| 2 | Customer Dressing Brief and governed normalization | Phase 0 registry; Phase 1 authority | 1.5–2.5 weeks |
| 3 | Personal Outfit Memory projector | contracts, evidence/history | 1.5–2.5 weeks |
| 4 | Personal Outfit Directions | Posture, Memory, Style Profile | 2–3 weeks |
| 5 | Restrained composition | directions, garment retrieval | 1.5–2.5 weeks |
| 6 | Hard Validation refactor | composed-look contract | 4–6 days |
| 7 | Stylist Adjudication | validated looks, diagnostics | 2–3 weeks |
| 8 | Consultation/correction unification | posture, directions, adjudication | 1.5–2.5 weeks |
| 9 | Shadow evaluation and controlled Preview gate | all prior phases | 1.5–2.5 weeks |

Expected elapsed time is approximately **10–15 calendar weeks** for one engineer working serially, or **6–9 calendar weeks** with carefully separated parallel ownership after contracts are approved. Quality review time is included but founder response time is not.

## 13. Safe parallelism

After Phase 0 contracts are frozen and their acceptance criteria pass:

- Phase 1 persistence/isolation work may proceed alongside Phase 2 normalization fixtures where interfaces are already frozen.
- Evaluation fixtures and diagnostics may proceed throughout.
- Current Preview continuity and rollback verification proceed throughout.

Must remain sequential:

- direction generation after Posture contract;
- composition after Direction contract;
- adjudication after validated complete looks;
- V2 Evaluation mode after all applicable gates;
- Production rollout after Founder, Product, broader-customer, shadow, and explicit authorization gates.

## 14. Files and ownership map

Proposed modules:

```text
lib/recommendations/v2/
  contracts/
    dressing-posture.ts
    personal-outfit-memory.ts
    personal-outfit-direction.ts
    stylist-adjudication.ts
    consultation-correction.ts
    reason-codes.ts
  posture/
    resolve.ts
    questions.ts
  memory/
    project.ts
    relations.ts
  directions/
    build.ts
    retrieve-foundations.ts
  composition/
    compose.ts
    supports.ts
    simplify.ts
  validation/
    hard-validation.ts
  adjudication/
    adjudicate.ts
    challenger.ts
    validate-decision.ts
  consultation/
    apply-correction.ts
    persistence.ts
  diagnostics/
    trace.ts
  orchestration/
    recommend.ts
```

Existing `lib/recommendations/engine/governed-engine.ts` remains frozen until the V2 path passes shadow evaluation. It will not be incrementally transformed in place.

## 15. Program acceptance criteria

Architecture V2 is ready to replace Current Preview only when:

- Dressing Posture precedes all garment retrieval;
- Event Policy is limited to narrow hard viability;
- complete concepts precede item search;
- personally plausible foundations and known combinations are first-class;
- optional roles are truly optional;
- unknown evidence is consequence-aware;
- every surfaced look is structurally and factually valid;
- Stylist Adjudication, not aggregate score, selects the primary;
- one recommendation, one focused question, or abstention are valid outcomes;
- correction preserves context and declares memory scope;
- all data and memory are owner-scoped, reviewable, exportable, and deletable;
- explanations cite only decisive, supported facts;
- the frozen evaluation baseline improves without new hard-rule regressions;
- the current Founder Preview remains usable and V2 failures do not block unrelated product surfaces;
- recommendation and cache artifacts identify customer, architecture, engine, taxonomy, and contract versions;
- broader-customer evaluation fixtures and cross-user isolation gates are ready before cohort rollout;
- Founder diagnostics remain observational and cannot alter customer treatment;
- the Brand Bible alignment check passes;
- the founder explicitly approves the completed default Preview experience.

Founder-only V2 Evaluation may precede this final gate only under the isolated,
non-default, phase-level rule above.
