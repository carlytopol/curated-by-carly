# Recommendation Quality Program — Implementation Plan

> **HISTORICAL / SUPERSEDED — DO NOT IMPLEMENT AGAINST THIS PLAN.** This July 28 plan is retained only as historical and supporting technical context. The July 29 `RECOMMENDATION_QUALITY_ROADMAP.md` and approved `RECOMMENDATION_ARCHITECTURE_V2.md` are the governing authorities; phased delivery follows `RECOMMENDATION_IMPLEMENTATION_PLAN_V2.md`.

**Status:** Approved program decomposition  
**Owner:** Chief Product Officer  
**Date:** July 28, 2026  
**Source:** `RECOMMENDATION_QUALITY_ROADMAP.md`  
**Purpose:** Deliver Recommendation Quality Program improvements through independently completable, parallel engineering phases

## 1. Executive decision

The Recommendation Quality Program should be delivered through **three parallel workstreams and twelve independently releasable phases**:

- **Workstream A — Evidence:** establish reliable garment and personal evidence.
- **Workstream B — Planning:** translate context and personal style into an explicit outfit strategy.
- **Workstream C — Judgment:** reject, rank, calibrate, and explain whole looks credibly.

Engineering should not wait for an entire initiative to finish before beginning another. Parallelism is created through small, versioned contracts:

1. Evidence Contract
2. Outfit Plan Contract
3. Evaluation Contract

Once a contract is approved, downstream phases may build against stable fixtures while upstream data coverage continues to improve.

The highest quality-per-effort phases are:

1. **A1 — Evidence contracts and sufficiency diagnostics**
2. **C1 — Veto separation and honest confidence gates**
3. **B1 — Outfit Plan foundation**
4. **B3 — Candidate-relative support assembly**
5. **A2 — Decision-critical garment evidence**

These address false certainty, wrong outfit class, repeated default accessories, and missing garment truth without waiting for advanced personalization or long-term learning.

## 2. Estimation framework

Effort is expressed as **engineer-weeks**: one engineer working full-time for one week. Estimates include implementation, unit/contract tests, observability, and technical documentation, but exclude extended founder review or production-data collection time.

| Size | Engineer-weeks | Typical scope |
| --- | ---: | --- |
| Small | 1–2 | One bounded contract or decision stage |
| Medium | 2–4 | Cross-module behavior with migrations or evaluation work |
| Large | 4–6 | New orchestration capability spanning several engine stages |

Estimates assume the existing governed engine, Personal Styling Brief, Founder Validation Suite, Profile domain, and wardrobe repositories remain available. Engineering should refine estimates after contract review without changing product acceptance criteria.

## 3. Program quality baseline

Before phase work begins, retain the current Founder Validation report as the immutable baseline and record:

- critical garment-evidence coverage;
- percentage of candidates with unsupported or unknown decision-critical traits;
- Event Policy and requested-intent compliance;
- outfit-plan compliance once available;
- support-piece repetition across unrelated contexts;
- whole-look human acceptance band;
- cohesion and polish score distribution;
- high/medium/low confidence distribution;
- inappropriate high-confidence rate;
- unsupported explanation-claim rate;
- abstention/no-recommendation rate;
- primary-versus-challenger reviewer preference.

Quality deltas in this plan are measured against that frozen baseline using the same wardrobe and scenarios, then confirmed on a broader synthetic corpus. No phase is considered successful solely because it changes the ten founder outputs.

## 4. Parallel workstream map

```text
Program contract gate
        │
        ├── A1 Evidence contracts + diagnostics
        │      ├── A2 Critical garment evidence
        │      ├── A3 Personal evidence integration
        │      └── A4 Sufficiency + focused-question policy
        │
        ├── B1 Outfit Plan foundation  ← Evidence contract fixtures
        │      ├── B2 Context strategy library
        │      ├── B3 Candidate-relative support assembly
        │      └── B4 Candidate intent portfolio
        │
        └── C1 Veto + confidence gates ← Evidence/plan fixtures
               ├── C2 Relational cohesion + personal polish
               ├── C3 Editorial challenger + abstention
               └── C4 Calibration, explanation truth + shadow release
```

### Safe parallelism

- A1, B1, and C1 may begin together once the three contract owners agree on stable identifiers and fixtures.
- A2 and A3 may proceed in parallel after A1.
- B2 and B3 may proceed in parallel after B1; B3 consumes plan fixtures before B2's full strategy catalog is complete.
- C2 may begin against synthetic Evidence and Outfit Plan fixtures after A1 and B1 contracts stabilize.
- A4, B4, and C3 may proceed in parallel once their immediate dependencies are met.
- C4 runs as a continuous evaluation lane but becomes the final deployment gate.

## 5. Workstream A — Recommendation Evidence Foundation

### Phase A1 — Evidence contracts and sufficiency diagnostics

**Priority:** 1 — highest leverage  
**Effort:** Medium, **2–3 engineer-weeks**

#### Objective

Define the canonical, versioned evidence model for garment facts, personal evidence, provenance, confidence, freshness, correction authority, and unknown values. Add request-level diagnostics that expose whether the engine has enough evidence to make each material decision.

This phase establishes meaning and observability. It does not require enriching the entire wardrobe.

#### Dependencies

- Existing wardrobe, Profile, history, and recommendation domain boundaries.
- Approved precedence in `AI_STYLIST_ENGINE.md`, `PERSONAL_STYLE_SURVEY_PRD.md`, and `RECOMMENDATION_QUALITY_ROADMAP.md`.
- No dependency on A2–A4, B phases, or C phases.

#### Architecture

- Versioned Garment Evidence contract.
- Versioned Personal Evidence contract.
- Shared provenance and confidence taxonomy.
- First-class `unknown`, `conflicted`, `stale`, and `not-applicable` states.
- Request-level Evidence Sufficiency report by critical dimension.
- Feature-specific minimal projections.
- Stable reason codes for testing and evaluation.

#### Acceptance criteria

- Every evidence value includes owner, value, provenance, confidence, schema version, and correction authority.
- Time-sensitive evidence includes freshness or effective time.
- Unknown cannot be serialized as a positive fact.
- Wardrobe ownership and frequency are not represented as preference or confirmed use.
- Explicit current instruction, explicit Profile answer, confirmed correction, confirmed wear, observed behavior, and inference remain distinguishable.
- Evidence Sufficiency reports context, garment, environment, movement, personal style, availability, and combination dimensions.
- All consumers can operate against deterministic fixtures without querying source tables directly.
- Cross-user evidence fails closed.
- Diagnostics contain reason codes and coverage counts but no private answer content.

#### Measurable recommendation-quality improvement

- **100%** of recommendation decisions can identify the provenance of every consumed evidence value.
- Unsupported positive factual claims in engine traces fall to **0%**.
- The Founder Suite reports an explicit sufficiency state for **100%** of scenarios instead of treating missing traits as silent defaults.
- Establishes the measurable baseline required for every later quality phase.

### Phase A2 — Decision-critical garment evidence

**Priority:** 5 — high impact  
**Effort:** Large, **4–6 engineer-weeks**

#### Objective

Populate and maintain the garment evidence needed to decide formality, weather suitability, movement, role, and practical execution without turning the wardrobe into an exhaustive data-entry exercise.

#### Dependencies

- A1 Evidence Contract.
- Existing wardrobe metadata, imagery, correction, and ownership services.
- May run in parallel with A3, B2, B3, and C1.

#### Architecture

Prioritize evidence used across most recommendations:

- authoritative garment role/category;
- formality range;
- silhouette and fit behavior;
- material/weight;
- warmth and breathability;
- rain/water tolerance;
- shoe walkability and standing tolerance;
- pocket presence/function;
- movement/activity suitability;
- occasion suitability;
- availability/care state.

Evidence can originate from confirmed metadata, bounded inference, or customer correction. Inference remains confidence-bounded and reviewable. The system enriches decision-critical unknowns progressively rather than demanding full closet completion.

#### Acceptance criteria

- At least 90% of garments entering final Founder Suite recommendations have reliable role, formality, environmental, and movement evidence relevant to that scenario.
- No final candidate relies on an unknown required property without a confidence cap or focused question.
- User correction outranks image/model inference immediately.
- Brand, price, and garment ownership cannot raise formality, quality, comfort, or suitability confidence by themselves.
- Evidence enrichment and correction update the canonical garment domain, not recommendation-specific copies.
- Garments with sparse evidence remain usable when the decision is robust and become conditional when it is not.
- Evidence coverage and correction rates are observable by non-sensitive reason code.

#### Measurable recommendation-quality improvement

- Reduce unknown decision-critical garment traits in the Founder Suite from the current baseline by **at least 60%**.
- Achieve **0** approved options with unsupported walkability, pocket, weather-resistance, or layer claims.
- Reduce human-reviewed “wrong garment class for the context” failures by **at least 40%** relative to baseline.

### Phase A3 — Personal evidence and combination history

**Priority:** 8 — strategic compounding value  
**Effort:** Medium, **3–4 engineer-weeks**

#### Objective

Provide the Personal Style Interpretation Layer with user-specific evidence about explicit preferences, confirmed wears, accepted modifications, contextual corrections, Style Archive choices, and repeated combinations without allowing behavior to overwrite explicit answers.

#### Dependencies

- A1 Evidence Contract.
- Existing Style Profile, wardrobe history, recommendation outcome, and archive domains.
- May run in parallel with A2, B2, B3, and C2.

#### Architecture

- Feature-scoped Personal Evidence projection.
- Confirmed-wear and confirmed-combination evidence.
- Exposure-aware recommendation outcome evidence.
- Context-specific corrections and reservations.
- Explicit-versus-inferred conflict representation.
- Learning-consent enforcement.
- No automatic promotion of behavioral signals to explicit preference.

#### Acceptance criteria

- Confirmed wear is distinct from recommendation, view, acceptance, and satisfaction.
- Repeated combinations carry context, count, time, and provenance.
- Survey/Profile answers outrank unconfirmed behavioral patterns.
- Dismissed or contradicted inferences cannot affect generation.
- Disabling learning excludes behavioral aggregation without removing explicit preferences.
- An absent or empty profile produces neutral—not genericized—personal interpretation.
- The engine can explain whether a personal directive came from “You told us,” “You confirmed,” or “Curated noticed.”

#### Measurable recommendation-quality improvement

- On evaluation users with sufficient history, at least **80%** of personal-style directives trace to explicit or confirmed evidence.
- Reduce recommendations containing context-reserved garments by **at least 80%**.
- Increase human reviewer agreement that “this person would plausibly choose this” by **at least 20 percentage points** versus the same engine with personal evidence removed.

### Phase A4 — Evidence sufficiency, focused questions, and confidence caps

**Priority:** 6 — strong trust return  
**Effort:** Medium, **2–3 engineer-weeks**

#### Objective

Turn evidence gaps into governed product behavior: proceed confidently, proceed conditionally, ask one decision-changing question, or abstain.

#### Dependencies

- A1 Evidence Contract and diagnostic.
- C1 confidence/abstention interface.
- Benefits from A2 and A3 but does not require full coverage.

#### Architecture

- Critical-dimension sufficiency thresholds.
- Lowest-critical-dimension confidence cap.
- Question-value calculation based on whether an answer could change the Outfit Plan or candidate winner.
- One-question-at-a-time contract.
- Conditional recommendation and honest abstention states.

#### Acceptance criteria

- Each request receives a documented proceed/question/conditional/abstain decision.
- Missing non-material data never triggers a question.
- Missing material data cannot be hidden by a high aggregate score.
- No request asks more than one question at a time.
- Skipping a question does not create a preference or false fact.
- The same evidence state produces the same confidence cap regardless of model wording.
- Error, missing-data, and abstention language follows the Brand Bible.

#### Measurable recommendation-quality improvement

- Inappropriate high-confidence recommendations fall to **0** in the Founder and synthetic suites.
- At least **90%** of focused questions are rated decision-changing by product review.
- Unsupported recommendation output decreases without increasing unnecessary-question rate above **10%** of otherwise robust scenarios.

## 6. Workstream B — Contextual Outfit Planning

### Phase B1 — Outfit Plan foundation

**Priority:** 3 — very high quality per effort  
**Effort:** Medium, **2–3 engineer-weeks**

#### Objective

Introduce a versioned, request-specific Outfit Plan that defines the type of complete look the engine intends to compose before Candidate Generation begins.

#### Dependencies

- Approved Evidence Contract shape or stable fixtures from A1.
- Existing Event Policy and Personal Styling Brief contracts.
- Does not require A2/A3 production coverage.

#### Architecture

The plan contains:

- target occasion and priority;
- target polish band;
- practicality/expression posture;
- permitted foundation strategies;
- required/prohibited/optional roles;
- movement and comfort posture;
- footwear, bag, layer, and weather-protection strategy;
- transition posture;
- palette/pattern and silhouette direction;
- personal reservations;
- unresolved questions and evidence confidence;
- plan and source versions.

#### Acceptance criteria

- Every generated candidate references exactly one Outfit Plan version.
- The plan is created from Event Policy and Personal Styling Brief; it contains no selected garment IDs.
- Event Policy hard constraints cannot be relaxed by the plan.
- Missing required roles are represented before candidate generation.
- Plan output is deterministic for the same governed evidence and versions.
- Neutral personal evidence yields a context-led plan without invented personal taste.
- Plan diagnostics are included in validation artifacts without private free text.

#### Measurable recommendation-quality improvement

- **100%** of generated candidates become traceable to an explicit plan.
- Founder review can distinguish casual, polished casual, business casual, polished, travel, and rain plans before seeing garments in **at least 90%** of scenarios.
- Reduce “wrong class of outfit” generation entering assembly by **at least 40%**.

### Phase B2 — Reusable context strategy library

**Priority:** 7 — broad scenario generalization  
**Effort:** Medium, **3–4 engineer-weeks**

#### Objective

Create reusable context strategies that compose practical day requirements without adding named founder-scenario branches.

#### Dependencies

- B1 Outfit Plan.
- A1 evidence taxonomy.
- May run in parallel with A2, A3, B3, and C2.

#### Architecture

Initial strategy primitives cover:

- heat plus standing/walking;
- rain plus transitions/carrying;
- professional credibility plus movement;
- travel plus sitting, walking, temperature change, and arrival;
- social polish without formalization;
- bag restriction plus secure storage;
- indoor/outdoor transition;
- one-look day versus justified change.

Strategies combine through documented precedence and can be tested independently of a wardrobe.

#### Acceptance criteria

- No strategy is named for a specific venue, customer, wardrobe item, or Founder Suite scenario.
- Multiple compatible strategies can compose without dropping hard requirements.
- Conflicting strategies produce an explicit priority or focused question.
- Travel plans require a documented layer decision, even when the decision is “none needed.”
- Rain plans require documented footwear and protection decisions.
- Walking-heavy plans require documented footwear and carrying decisions.
- Professional movement plans address credibility and execution together.

#### Measurable recommendation-quality improvement

- Achieve **95%** context-strategy coverage across the ten Founder scenarios and approved synthetic scenario taxonomy.
- Reduce missing practical-role decisions in plan review to **0**.
- Reduce human-reviewed context mismatch by **at least 50%** relative to baseline.

### Phase B3 — Candidate-relative support assembly

**Priority:** 4 — immediate visible quality improvement  
**Effort:** Medium, **3–4 engineer-weeks**

#### Objective

Select footwear, bags, layers, jewelry, and other support pieces in relation to each foundation and Outfit Plan rather than reusing globally high-scoring defaults.

#### Dependencies

- B1 Outfit Plan.
- Existing typed Complete Outfit assembly.
- A1 evidence fixtures; improved by A2 but not blocked by it.

#### Architecture

- Candidate-relative role fulfillment.
- Foundation/support relational evaluation during assembly.
- Explicit optionality: support pieces are omitted when they do not improve or complete the plan.
- Support-piece scarcity and only-viable-choice trace.
- Role-specific diversity after quality, not before it.

#### Acceptance criteria

- Every support piece records which plan requirement or compositional relationship justified it.
- Fragrance, jewelry, bag, or layer is not automatically included.
- A formal shoe cannot serve as the sole mechanism for increasing whole-look polish.
- Support pieces are reconsidered for every foundation.
- Repetition across options is allowed only when no equally viable alternative exists and is traceable.
- Footwear and bag choices satisfy both function and whole-look relationship.

#### Measurable recommendation-quality improvement

- Reduce unjustified support-piece repetition across unrelated Founder scenarios by **at least 70%**.
- Reduce human-rejected footwear/foundation and bag/foundation pairings by **at least 60%**.
- Achieve **100%** traceability for included optional support pieces.

### Phase B4 — Candidate intent portfolio and meaningful alternatives

**Priority:** 10 — important after primary quality stabilizes  
**Effort:** Medium, **2–3 engineer-weeks**

#### Objective

Generate a small portfolio of candidates with materially different, useful intentions so the primary answer is chosen through comparison and the alternative represents a genuine option.

#### Dependencies

- B1 Outfit Plan.
- B3 candidate-relative assembly.
- C2 evaluation contract or stable scoring fixtures.
- Personal intent becomes stronger with A3 but is not mandatory.

#### Architecture

Candidate intents:

- strongest practical;
- strongest personally characteristic;
- strongest expressive but equally viable;
- strongest wardrobe utility when excellent.

Each intent defines what may differ and what must remain equally valid. Near-duplicate detection operates on strategy, foundation, silhouette, and complete composition—not just item IDs.

#### Acceptance criteria

- Each candidate declares one intent.
- Candidate intents cannot weaken Event Policy or hard personal constraints.
- Alternatives differ materially in strategy, silhouette, foundation, or expression.
- Cosmetic accessory swaps alone do not qualify as alternatives.
- The system may produce one candidate when no responsible alternative exists.
- Primary selection compares candidates head-to-head under the same Outfit Plan.

#### Measurable recommendation-quality improvement

- At least **85%** of surfaced alternatives are rated materially different and equally viable by review.
- Near-duplicate surfaced options fall below **5%**.
- Primary-versus-alternative reviewer preference is explainable by distinct reason codes in **100%** of cases.

## 7. Workstream C — Whole-Look Judgment and Calibration

### Phase C1 — Veto separation and honest confidence gates

**Priority:** 2 — fastest trust improvement  
**Effort:** Small/Medium, **1–2 engineer-weeks**

#### Objective

Ensure structural, policy, personal-constraint, and practical failures cannot be rescued by aggregate score, and prevent low critical confidence from being presented as an assured recommendation.

#### Dependencies

- Existing Validation and Event Policy stages.
- Stable reason-code fixtures from A1 or provisional contract alignment.
- B1 fixtures for plan-compliance veto; full plan may follow incrementally.

#### Architecture

- Independent veto result separated from ranking score.
- Critical-confidence gate separated from outfit quality score.
- Explicit valid / provisional / question / abstain result states.
- No explanation generation for rejected candidates.

#### Acceptance criteria

- Every veto has a single owning stage and provenance requirement.
- No failed veto contributes to or can be overridden by ranking.
- Critical low confidence caps overall confidence.
- Rejected candidates never reach final explanation or option selection.
- Abstention is a valid product outcome, not a server error.
- Result states remain stable under score-weight changes.

#### Measurable recommendation-quality improvement

- Hard-rule violations in surfaced recommendations remain **0**.
- Inappropriate high-confidence output falls to **0**.
- Human-rejected candidates with a known veto condition reaching option selection fall to **0**.
- Delivers an immediate trust improvement before advanced scoring is complete.

### Phase C2 — Relational cohesion and personal-polish model

**Priority:** 9 — high impact, higher complexity  
**Effort:** Large, **4–6 engineer-weeks**

#### Objective

Replace non-discriminating cohesion and polish values with independent, evidence-aware whole-look evaluation across relationships among garments, context, and personal style.

#### Dependencies

- A1 Evidence Contract.
- B1 Outfit Plan Contract.
- Can use fixtures while A2/A3/B2 continue.
- Requires reviewed examples from the Founder Suite and synthetic corpus.

#### Architecture

Independent factors include:

- formality consistency;
- silhouette/proportion relationship;
- color/pattern relationship;
- material/weight relationship;
- footwear/foundation relationship;
- bag/accessory relationship;
- practical day coherence;
- intentional contrast;
- personal-style coherence;
- plan-specific polish.

Each factor returns score or unknown, evidence confidence, reason codes, and supporting provenance. Missing factors are removed and confidence-adjusted according to the governed model.

#### Acceptance criteria

- Cohesion and personal polish are computed from multiple whole-look relationships, not a single item or default constant.
- Unknown evidence cannot create a positive factor score.
- A designer label, price, formal shoe, or statement bag cannot independently raise whole-look polish.
- Intentional contrast can score well when supported; conformity is not required.
- Factor weights and thresholds are versioned independently.
- Reviewers can understand why two otherwise valid outfits receive different results.

#### Measurable recommendation-quality improvement

- Cohesion and polish scores show statistically meaningful separation between founder-accepted, borderline, and rejected reviewed looks.
- At least **80%** of pairwise human quality judgments agree with engine ordering on the calibration set.
- Constant or near-constant cohesion/polish outputs across diverse scenarios are eliminated.
- Human-rejected “technically complete but incoherent” looks decrease by **at least 60%**.

### Phase C3 — Editorial challenger and governed abstention

**Priority:** 11 — final judgment quality  
**Effort:** Medium, **3–4 engineer-weeks**

#### Objective

Require every proposed primary recommendation to survive a whole-look editorial review and a “something better” challenge, while allowing the system to decline weak output.

#### Dependencies

- C1 veto and confidence gates.
- C2 evaluation factors.
- B1 Outfit Plan; improved by B4 candidate intents.

#### Architecture

- Editorial review consumes validated candidates, Outfit Plan, Styling Brief, factor evidence, and confidence.
- Challenger searches within the same valid plan for a material improvement.
- Review can approve, replace with challenger, return to candidate generation, ask one question, lower confidence, or abstain.
- Every decision produces bounded reason codes, not hidden reasoning.

#### Acceptance criteria

- Every primary candidate has a recorded challenger outcome.
- Editorial Review cannot change garment facts, relax policy, or repair prose.
- A challenger replaces the primary only when it improves the whole look materially.
- Review does not reward novelty for its own sake.
- Repeated failed challenges terminate in question or abstention rather than an unbounded loop.
- Human reviewers can reproduce the decision from evidence and reason codes.

#### Measurable recommendation-quality improvement

- At least **90%** of surfaced primaries are rated “confidently wearable for this exact day” in founder review.
- Challenger replacement improves reviewer preference in **at least 70%** of cases where replacement occurs.
- “No responsible recommendation” precision reaches **at least 85%** on deliberate abstention scenarios.

### Phase C4 — Calibration, explanation truth, and shadow-release gate

**Priority:** 12 — deployment gate, continuous lane  
**Effort:** Medium/Large, **3–5 engineer-weeks initial**, then ongoing

#### Objective

Create the stable evaluation, calibration, factual-explanation, and shadow-release system required to prevent quality regression across future engine versions and wardrobes.

#### Dependencies

- Can begin fixture and review-set work after A1/B1.
- Final release calibration depends on A2, B2/B3, C1/C2, and C3.
- Uses B4 when alternatives are included in release.

#### Architecture

- Versioned founder-reviewed and synthetic scenario corpus.
- Counterfactual outfit pairs.
- Quality bands rather than one exact answer.
- Confidence calibration and abstention evaluation.
- Explanation fact projection and claim validator.
- Shadow-run comparison between current and candidate engine versions.
- Regression dashboards using non-sensitive reason codes.

#### Acceptance criteria

- Evaluation asserts eligibility, quality bands, required/prohibited properties, confidence, and factual explanations without requiring one exact outfit.
- Explanation claims about polish, walkability, weather, material, pockets, comfort, or personal preference require supporting evidence.
- Candidate engine runs in shadow before user exposure.
- High-impact rule/weight/model changes require the same evaluation gates.
- Founder wardrobe is not the only calibration source.
- Privacy-safe evaluation fixtures contain no unnecessary private data.
- Release can be rolled back by engine/rules/version without corrupting Profile or history.

#### Measurable recommendation-quality improvement

- Unsupported explanation claims fall to **0** in the release suite.
- Regression detection covers **100%** of governed hard constraints and critical quality factors.
- Candidate engine must improve human-reviewed whole-look quality by **at least 25 percentage points** over the frozen baseline with no increase in hard-rule violations.
- Confidence calibration error meets the approved threshold across high, medium, low, and abstain outcomes before release.

## 8. Priority order by quality improvement per effort

| Priority | Phase | Effort | Why now |
| ---: | --- | --- | --- |
| 1 | A1 Evidence contracts + diagnostics | 2–3 weeks | Makes every unknown, claim, and dependency observable |
| 2 | C1 Veto + confidence gates | 1–2 weeks | Immediately prevents false assurance and score rescue |
| 3 | B1 Outfit Plan foundation | 2–3 weeks | Stops generation from beginning without a complete strategy |
| 4 | B3 Candidate-relative support assembly | 3–4 weeks | Addresses repeated shoes/bags and visible relational failures |
| 5 | A2 Critical garment evidence | 4–6 weeks | Improves every policy, plan, validation, and explanation stage |
| 6 | A4 Sufficiency + focused questions | 2–3 weeks | Converts uncertainty into trustworthy product behavior |
| 7 | B2 Context strategy library | 3–4 weeks | Generalizes weather, movement, work, travel, and transition planning |
| 8 | A3 Personal evidence + combinations | 3–4 weeks | Creates long-term personalization advantage |
| 9 | C2 Cohesion + personal polish | 4–6 weeks | Provides discriminating whole-look judgment |
| 10 | B4 Candidate intent portfolio | 2–3 weeks | Makes alternatives meaningful after primary quality improves |
| 11 | C3 Editorial challenger + abstention | 3–4 weeks | Adds final considered judgment after factors are credible |
| 12 | C4 Calibration + shadow release | 3–5 weeks initial | Governs deployment and all future quality changes |

Priority is not identical to start order. C4 evaluation-corpus preparation should begin early even though final calibration finishes last.

## 9. Recommended parallel delivery waves

### Wave 0 — Contract alignment, one week

- Assign owners for Evidence, Outfit Plan, and Evaluation contracts.
- Freeze the Founder baseline and agree on quality-band review protocol.
- Approve stable reason-code and versioning conventions.

### Wave 1 — Highest-return foundation

Run in parallel:

- A1 Evidence contracts and diagnostics
- B1 Outfit Plan foundation using evidence fixtures
- C1 Veto and confidence gates using evidence/plan fixtures
- C4 evaluation corpus and review protocol only

**Expected duration:** 2–3 calendar weeks with three engineers or small pairs.

### Wave 2 — Visible recommendation improvement

Run in parallel:

- A2 decision-critical garment evidence
- A3 personal evidence and combinations
- B2 context strategy library
- B3 candidate-relative support assembly
- C2 relational factor prototypes against fixtures

**Expected duration:** 4–6 calendar weeks with parallel ownership.

### Wave 3 — Trust and decision quality

Run in parallel:

- A4 sufficiency, questions, and confidence caps
- B4 candidate intent portfolio
- C2 production completion
- C3 editorial challenger and abstention
- C4 explanation validation and shadow infrastructure

**Expected duration:** 3–5 calendar weeks.

### Wave 4 — Calibration and release

- Run the Founder Suite, broader synthetic suite, authorization/privacy suite, and shadow comparison.
- Complete founder quality-band review.
- Tune only governed, versioned parameters—not scenario branches.
- Release only after all Program gates pass.

**Expected duration:** 2–3 calendar weeks plus sufficient shadow traffic.

## 10. Program-level acceptance criteria

The Recommendation Quality Program is complete only when:

- all consumed evidence is provenance-aware and user-scoped;
- critical unknowns govern confidence or questions;
- every candidate traces to an Outfit Plan and candidate intent;
- support pieces are candidate-relative and justified;
- hard failures cannot be rescued by score;
- cohesion and polish discriminate strong from weak complete looks;
- every primary survives an editorial challenge;
- abstention is available and calibrated;
- explanations contain only supported claims;
- the engine improves the frozen Founder quality baseline by at least 25 percentage points;
- no hard-rule, ownership, or known-availability regression is introduced;
- improvements generalize to synthetic small, sparse, uniform, expressive, travel, weather, work, and social wardrobes;
- Style Profile answers and later behavior remain separate, correctable, and private;
- no phase introduces shopping pressure or consumption as a recommendation fallback.

## 11. Program risks and controls

| Risk | Control |
| --- | --- |
| Parallel teams redefine the same concept | Contract owners and versioned shared taxonomies |
| Fixture implementation diverges from production data | Contract tests required before integration |
| Evidence work becomes exhaustive cataloging | Decision-critical domains and progressive correction only |
| Context library becomes scenario-specific rules | Primitive strategies may not include venue/customer/scenario names |
| Scoring is tuned to the founder wardrobe | Broader synthetic corpus and shadow evaluation required |
| Human review rewards conventional dressing | Multiple valid quality bands and intentional-contrast cases |
| Abstention harms usefulness | Measure appropriate abstention and improve upstream evidence/planning |
| Learning reinforces Curated's own recommendations | Exposure-aware evidence and independent-choice distinction |
| Architecture accumulates duplicate logic | One owner each for evidence, plan, veto, factor, and claim |

## 12. Final engineering direction

Engineering is approved to begin Wave 0 and Wave 1 in parallel.

No phase is authorized to introduce founder-scenario-specific rules, wardrobe-item exceptions, brand-based quality assumptions, or generic AI judgment outside the governed contracts. Each phase must demonstrate its quality delta independently before its behavior becomes a dependency of the next release candidate.

The deployment decision remains gated by C4 shadow evaluation and the Program-level acceptance criteria—not by completion of tickets or production of three outfits for every scenario.
