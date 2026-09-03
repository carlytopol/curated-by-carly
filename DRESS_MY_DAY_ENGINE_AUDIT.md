# Dress My Day recommendation-engine audit

Date: 2026-07-27  
Scope: production behavior, the current working tree, today’s task history, Dress My Day architecture documents, and the current recommendation route.

## Root causes

1. **The route selected pieces before it understood the day.** It read one `daily_events` row and a browser weather payload, then filtered individual items. It did not first produce one typed, provenance-aware context record.
2. **The DailyAgenda boundary was bypassed.** The production route consumed a manual event directly even though Calendar Integration defines DailyAgenda as the provider-independent boundary.
3. **A broad model prompt acted as the primary stylist.** The model received a ranked list and was asked to solve eligibility, completion, cohesion, variety, context, and explanation in one call. Those are governed product decisions, not prompt-only responsibilities.
4. **The fallback was a cross-product, not a stylist.** It paired tops and bottoms and appended the first acceptable support items. It had no whole-look factor score, confidence calculation, challenger, or explanation truth check.
5. **Validation was mostly structural.** It checked IDs, required roles, duplicate main pieces, and a growing list of regular-expression exceptions. It did not assess the complete outfit against weighted occasion, weather, comfort, polish, utility, fit, and color evidence.
6. **Wardrobe metadata is sparse and ungoverned.** The persisted schema has category, subcategory, color, season, styling notes, availability, and history, but no first-class fabric, silhouette, formality, warmth, walkability, rain tolerance, or occasion fields. Some analysis metadata may contain those facts, but the old route did not read it.
7. **Weather evidence was incomplete and browser-authoritative.** The old route used current temperature and the first forecast high. It ignored apparent temperature, lows, precipitation, wind, humidity, event time, and transitions.
8. **Venue intelligence did not exist.** “Stadium” behavior was inferred from keywords. No official source, retrieval time, confidence, cache, contradiction handling, or unknown state was recorded.
9. **User corrections were too narrow.** Confirmed incompatible item pairs persist, but other corrections were reduced to event notes or session intention. The old generation prompt could still ignore them.
10. **Explanations were generated independently of governed reasons.** A fluent rationale could claim comfort, weather suitability, or venue compliance even when no validator had proved those claims.
11. **Three-option diversity was checked too late.** The validator rejected reused main pieces after generation, producing retries and outages instead of selecting three distinct valid candidates from one candidate pool.
12. **Operational diagnosis was obscured.** Model errors, parse errors, invalid sets, and a genuine lack of valid outfits collapsed into the same generic production error.
13. **Today’s code was not committed.** `git log --since 2026-07-27` returned no commits. The current application is a large uncommitted working tree, so today’s changes cannot be audited as an ordered commit series.
14. **“Short-sleeve” was classified as “shorts.”** The role matcher used the unbounded expression `short` while checking bottoms before tops. In each supplied screenshot, the second blouse or T-shirt contained “short-sleeve,” so the validator falsely saw one top plus one bottom:
    - THML blouse + Doen Ruffled Short-Sleeve Blouse;
    - Sleeveless pleated blouse + Comme de Garcon Short-sleeve T-shirt;
    - Ulla Johnson blouse + Pilcro striped short-sleeve top.
    This is the exact reason all three visibly incomplete recommendations passed the old completeness gate.
15. **The candidate type allowed invalid outfits to exist.** Recommendations were represented as `itemIds: string[]`. The validator merely looked for the presence of roles; it did not enforce exactly one dress/jumpsuit or exactly one top plus exactly one bottom. Extra tops, a dress plus a bottom, and other malformed combinations were representable and could reach later stages.
16. **A high score could compensate for a weak validation model.** Validity was coupled to an aggregate threshold. Structural eligibility and editorial acceptability must instead be vetoes; ranking is allowed only after a candidate is already valid.
17. **Single-item corrections were not a durable hard constraint.** Pair incompatibilities persisted, but a correction such as “this formal skirt is not eligible here” did not become corrected item metadata. The item therefore remained in the candidate pool. Corrected wardrobe metadata and explicit user restrictions must be evaluated before assembly and take precedence over inferred tags.

## Governed architecture

The new path is:

1. Normalize the manual event to `DailyAgendaItem`.
2. Build `ContextEvidence`, separating verified facts, user statements, inferences, and unknowns.
3. Research only recognized material venues from an allowlisted official-source registry.
4. Rank availability and rotation, then apply hard whole-look constraints.
5. Construct a typed `CompleteOutfit`, whose foundation is a discriminated union: exactly one dress/jumpsuit, or exactly one top plus exactly one bottom. A loose garment list is not a candidate type.
6. Complete that outfit with exactly one pair of shoes, a bag only when appropriate, an outer layer only when needed, and optional jewelry and fragrance.
7. Run hard structural and correction eligibility checks. These are vetoes and cannot be rescued by score.
8. Run Editorial Validation over the complete composition: “Would an experienced luxury personal stylist confidently send this client to this event in this complete outfit?” A “no” rejects the candidate.
9. Rank only candidates that have passed both validations.
10. Select distinct options without reusing main garments.
11. Produce a deterministic explanation from the evidence that actually affected the result.
12. Return a transparent low-confidence/no-recommendation response when the evidence or wardrobe cannot support a responsible answer.

## Evidence and precedence

Precedence is:

1. persisted explicit user correction;
2. current explicit user statement;
3. verified official venue fact or weather observation;
4. deterministic inference;
5. unknown.

Unknown evidence does not become a negative fact and is not invented in the explanation.

## Venue research safeguards

- HTTPS-only, hard-coded official host allowlist;
- no user-provided fetch URL;
- redirects rejected;
- three-second timeout;
- declared and actual response-size cap;
- six-hour Next fetch revalidation;
- narrow text extraction for known policies;
- source URL, retrieval time, and confidence retained;
- failures become `unknown`, never an invented rule;
- user correction overrides inference and can be stricter than a verified exception.

Initial official sources:

- Atlanta Braves, Truist Park Bag Policy: `https://www.mlb.com/braves/ballpark/bag-policy`
- Atlanta Braves, Truist Park Security Measures: `https://www.mlb.com/braves/ballpark/security`

## Known limitations and Product decisions

- More reliable styling requires first-class wardrobe fields for fabric, silhouette, formality, warmth, walkability, rain tolerance, pocket presence, and occasion. The engine currently uses confirmed structured fields, styling notes, and analysis metadata, lowering confidence when evidence is sparse.
- The weather payload still originates in the existing page workflow. Moving weather retrieval entirely server-side, at event times and locations, remains required by the approved PRD.
- The route now normalizes a manual event to `DailyAgendaItem`, but a multi-event recommendation should consume the complete day’s `DailyAgenda` rather than one item.
- Venue coverage is deliberately narrow. A product decision is needed on a venue-data/search provider and persistence policy before expanding beyond reviewed official-source adapters.
- The approved V1 PRD says one primary look plus at most one alternative. Subsequent founder direction and the current product require three options. The implementation preserves the later three-option direction, but the documents should be reconciled.
- The current database stores engine version but not a compact decision record, factor scores, context snapshot, venue-source snapshot, or confidence. A migration and retention policy require Product review.

## Brand alignment

The system now favors discretion over forced output, explains decisions from real evidence, honors corrections, and treats comfort and reality as part of elegance. It avoids false confidence and preserves the customer’s agency, in line with Curated’s private-style-house positioning.
