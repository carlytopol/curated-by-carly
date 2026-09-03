# Style Profile Integration Boundary

> **V2 authority notice — July 29, 2026:** The explicit/inferred evidence separation and user-isolation model are retained. Token-affinity selection, unrestricted style vetoes, or any authority conflicting with `RECOMMENDATION_ARCHITECTURE_V2.md` are superseded. Style evidence informs Personal Outfit Direction but cannot override Event Policy or explicit current customer intent.

Status: retained evidence contract, subordinate to the approved V2 recommendation authority. Production remains frozen.

## Purpose

Event Policy answers, “What is viable here?” A Style Profile will answer, “What would this individual actually choose, and how would they make it their own?” These are separate judgments.

The approved recommendation sequence is:

1. Context Evidence
2. Event Policy and hard eligibility
3. Style Profile Resolver
4. Wardrobe Evidence Summary
5. Personal Style Interpretation and evidence reconciliation
6. Candidate Generation
7. Complete Outfit Assembly
8. Validation
9. Whole-outfit Cohesion Scoring
10. Editorial Review
11. Explanation and user correction

Event Policy remains authoritative for safety, weather, venue, mobility, availability, and explicit stipulations. Style Profile may rank or reject otherwise eligible outfits, but it may never make an ineligible item eligible.

## Current implementation boundary

`StyleProfileSnapshot` is an optional, immutable input to one recommendation request. It contains:

- the owning user ID;
- a profile version;
- an empty or active status;
- structured preferences;
- the profile update time.

Each preference has a dimension, value, prefer/avoid direction, strength, applicable contexts, provenance, confidence, and recorded time.

The engine resolves this snapshot after Event Policy. It separately builds a user-owned `WardrobeEvidenceSummary` from wardrobe composition, confirmed worn outfits, recommendation approvals/rejections, confirmed corrections, and opted-in behavioral signals. The interpreter reconciles—not merges—those sources into one immutable, request-specific `PersonalStylingBrief` before candidate generation. Supplying neither a Profile nor reliable evidence produces neutral behavior.

## PersonalStylingBrief v1

The versioned output contract preserves:

- profile owner and profile version;
- request and occasion scope;
- requested polish (`casual`, `polished-casual`, `polished`, `formal`, or `neutral`);
- current explicit instructions;
- structured directives for ranking, avoidance, requirement, reservation, combination, and observation;
- garment-role and occasion scope;
- polarity, authority, confidence, provenance, and source preference IDs.
- a separate Wardrobe Evidence Summary;
- material conflicts, their non-destructive resolution, and at most one focused question.

One brief instance and schema version must pass unchanged through candidate generation, whole-outfit cohesion, final Editorial Review, and explanation generation. Interpretation is stateless; historical inference remains in the Profile domain.

### Wardrobe Evidence Summary

The summary answers, “What does this user actually own and choose?” It never edits the Profile, which answers, “What has this user told us?” Every inference is advisory and contains confidence plus record-level provenance. The contract includes:

- dominant silhouettes;
- recurring color families;
- material patterns;
- formality and occasion distributions;
- frequently worn combinations;
- high-confidence, occasion-specific behavioral patterns;
- underused but explicitly profile-aligned items;
- items repeatedly rejected in a specific context.

Composition alone is not proof of preference. Confirmed wears and direct feedback carry stronger evidentiary weight. Low-confidence signals may guide but never veto. Behavioral learning is consumed only when the user has enabled it.

### Reconciliation

Explicit, current, specific answers remain authoritative. Contradictory wardrobe evidence cannot overwrite them. The interpreter must instead preserve the answer, lower inference confidence, or surface one focused question. This allows nuanced interpretations such as “selective with prints” or “casual by occasion” without silently rewriting “avoid prints” or globalizing graphic tees from errands to social events.

## Required user isolation

- Every snapshot is owned by exactly one authenticated user.
- The request user ID must match the profile owner before preferences can be consumed.
- A missing request identity or ownership mismatch fails closed.
- No aggregate or another user's preferences may be used as a fallback.
- Future persistence must use user-scoped row-level security and server-side retrieval.
- Preference data must not be exposed in recommendation diagnostics or shared with brands, advertisers, or other users.

## Preference dimensions

The controlled integration dimensions are intention, polish, aesthetic, silhouette, fit, color, pattern, comfort, footwear, weather, material, accessory, bag, branding, garment role, wardrobe priority, and whole-outfit combination.

## Provenance and authority

Supported provenance placeholders are:

1. survey response;
2. explicit correction;
3. outfit feedback;
4. observed behavior.

The survey PRD must define authority and decay rules. The anticipated principle is that direct, recent, context-specific user statements outrank inferred behavior. No observed behavior should silently become a permanent rule.

## Whole-outfit interpretation contract

Style Profile evaluation receives only candidates that passed Event Policy. It returns:

- a style-affinity assessment for the whole outfit;
- matched and conflicting preference IDs;
- confidence;
- whether the conflict is rankable or requires rejection;
- a concise, user-legible reason.

It must evaluate the complete look, not independently score garments. A logo tee may be liked generally but still conflict with a polished social intention. Conversely, a formal blouse may match a broad aesthetic yet remain ineligible for a hot stadium event.

## Feedback loop

Future feedback should be event-aware:

- “I like this” is evidence about this complete combination and context.
- “Too casual for a social concert” is a context-specific style correction.
- “I never wear logo tees socially” may become a broader explicit preference only after user confirmation.
- Skipping an option is weak evidence and must not be treated as a durable dislike.

Users must be able to review, edit, reset, export, and delete learned preferences.

Low-confidence inference may guide but cannot veto. Current explicit instructions override interpreted defaults. Context-specific explicit answers outrank general answers. Event Policy remains authoritative and no style direction can rescue an ineligible item.

## Brand alignment

The boundary treats style as personal continuity rather than generic taste clustering. It is private by default, explicit about uncertainty, reversible, and subordinate to the customer's own corrections. It preserves Curated's role as a discreet private style house rather than turning the product into an engagement-driven recommendation feed.
