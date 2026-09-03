# Recommendation Evidence Foundation

Status: implemented, not deployed  
Schema version: `garment-evidence.v1`

## Canonical garment evidence

Every garment fact used downstream is projected through one owner-scoped
`GarmentEvidence` contract. Each field retains its state, value, provenance,
confidence, source, correction authority, freshness, correction history, and
permitted consumers.

Confirmed wardrobe fields are authoritative. Accepted AI inference may fill an
unknown field at 80% confidence or higher, but it cannot overwrite a confirmed
value. Lower-confidence inference remains a review suggestion and is not
treated as fact. Unknown, conflicted, stale, and not-applicable are first-class
states.

## Shared consumers

The same projection is used by:

- Dress My Day candidate preparation
- Dress My Day follow-up
- Personal Shopper
- Travel
- wardrobe metadata audit
- founder diagnostics

Consumer projections omit internal source identifiers while preserving the
fact state, value, confidence, provenance, and correction authority.

## Wardrobe Evidence Summary

Wardrobe composition describes what a customer owns; it does not silently
become a style preference. Personal-style directives may come from explicit
answers or demonstrated behavior, but recurring colors and materials in the
closet remain descriptive evidence only.

The summary uses canonical evidence for silhouette, material, formality, and
other available garment facts, while preserving the existing separation among
explicit answers, wardrobe composition, confirmed wear, feedback, and
behavioral signals.

## Review policy

- 80% or greater: accepted as bounded inference when the canonical field is
  unknown.
- Below 80%: founder review.
- Confirmed customer value: protected from inference.
- Cross-user evidence: rejected.
- Missing decision-critical evidence: remains explicitly unknown and caps
  confidence through the evidence-sufficiency report.

## Acceptance measurement

The wardrobe audit now reports:

- canonical decision-critical facts known;
- reliable decision-critical facts;
- completeness and reliable-completeness percentages;
- unknown counts by field;
- low-confidence classifications and founder-review items.

No recommendation weights, scoring coefficients, or ranking formulas were
changed in this initiative.
