# Minimum Viable Recommendation Architecture V2

## Objective

Make Curated trustworthy enough to use every morning while the full Recommendation
Architecture V2 continues in small, reversible Preview phases. Production remains
unchanged until the founder explicitly approves a Preview build.

The daily-use test is simple:

> If I opened Curated tomorrow morning, would I genuinely trust it to help me get
> dressed?

## One-week boundary

This phase is intentionally narrower than the complete Architecture V2.

### Included

1. **Interaction reliability**
   - Hydration-safe first renders.
   - One submission path per action.
   - Visible pending, success, error, and retry states.
   - Draft preservation on failure.
   - Duplicate-submission protection.
   - Verified Profile, Dress My Day event Edit, correction, option cycling,
     “I wore this,” and wardrobe-item return flows.

2. **Dressing Posture — minimum useful contract**
   - Resolve practical demands, weather reality, movement, effort, social
     significance, and formality bounds before wardrobe retrieval.
   - Preserve verified facts, user statements, inference, and unknowns as
     separate evidence.
   - Do not allow style preferences to override safety or explicit instructions.

3. **Complete outfit foundations**
   - Generate only Dress, Jumpsuit, Coordinated Set, or Top + Bottom foundations.
   - Add shoes when required; bag and layers remain conditional.
   - Prefer one honest recommendation over three weak or invalid alternatives.
   - Keep existing structural and event-policy validation.

4. **Comparative adjudication — minimum useful contract**
   - Compare only complete, already-valid outfits.
   - Use Style Profile and Wardrobe Evidence as context for comparative judgment.
   - Scores remain diagnostic evidence, not the final authority.
   - If no candidate is trustworthy, explain the missing or uncertain fact and
     ask at most one focused question.

### Deferred

- Long-horizon personal outfit-memory learning.
- Full outfit knowledge-graph inference.
- Autonomous venue research expansion.
- New commerce or shopping behavior.
- Broad scoring retuning.
- Production rollout.

## Preview phases

### Phase 0 — Trust restoration

- Remove hydration and stale-state failures.
- Harden Profile and Style Notes mutations.
- Verify Dress My Day create, edit, correct, regenerate, retry, wear, and return
  interactions.
- Add a concise interaction audit with reproducible pass/fail evidence.

### Phase 1 — Dressing Posture

- Introduce a versioned, request-scoped `DressingPosture`.
- Derive it from the existing Context Evidence and Event Policy.
- Record it in recommendation diagnostics.
- Feature flag the behavior in Preview.

### Phase 2 — Foundation-first generation

- Restrict candidate generation to complete outfit foundations.
- Carry one Style Profile / Wardrobe Evidence snapshot through generation,
  validation, adjudication, and explanation.
- Permit fewer than three options when meaningful variation is unavailable.

### Phase 3 — Comparative stylist adjudication

- Compare valid complete candidates.
- Select the recommendation with the strongest contextual and personal case.
- Return transparent uncertainty rather than a polished explanation for a weak
  outfit.

## Acceptance criteria

- No known dead button or silent mutation failure in the audited daily-use path.
- A failed mutation preserves the customer’s work and offers one clear retry.
- Profile edits survive refresh.
- Dress My Day corrections persist and regenerate through the same shared route.
- Every displayed recommendation is a complete, structurally valid outfit.
- Explicit instructions and Event Policy always override style interpretation.
- Preview can return fewer than three options rather than dilute trust.
- Diagnostics identify the engine version, Dressing Posture, evidence version,
  candidate rejections, and final adjudication.
- Five consecutive founder-use mornings complete without a trust-breaking
  interaction or recommendation.

## Brand alignment

This scope treats reliability as hospitality. It favors discretion, continuity,
honest uncertainty, and a considered answer over feature volume. It remains
wardrobe-first and private by default, preserves customer agency, and removes
operational noise instead of adding another productivity layer.
