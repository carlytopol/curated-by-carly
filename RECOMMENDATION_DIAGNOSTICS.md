# Recommendation Diagnostics Framework

**Status:** Implementation foundation  
**Diagnostic contract:** `recommendation-diagnostic.v1`  
**Recommendation behavior:** Unchanged  
**Deployment:** Not authorized

## Boundary

This framework observes the governed recommendation pipeline after it has made
its decisions. It does not filter candidates, assemble outfits, change scores,
rank options, or alter explanations. A diagnostics-storage failure is
non-blocking and cannot prevent a customer from receiving a recommendation.

Diagnostics are private, user-owned, retained for 30 days, and contain no
provider credentials, calendar tokens, image URLs, or account email. Row-level
security limits every record to its owner.

## Recommendation Inspector

`buildRecommendationDiagnostic` produces one structured trace containing:

- the Context Constraint Matrix and Event Policy;
- weather and venue evidence, including provenance and unknowns;
- the resolved Style Profile;
- Wardrobe Evidence and the request-specific Personal Styling Brief;
- candidate templates, normalized roles, hard-rule results, scores, and
  rejection reasons;
- the eligibility audit;
- final complete outfits;
- cohesion, personal-polish, and confidence breakdowns.

Candidate traces explicitly disclose when the underlying engine’s diagnostic
capture was truncated. The inspector never represents partial trace coverage as
complete.

## Wardrobe Metadata Audit

The pure audit reports:

- missing core metadata and blank optional/helpful metadata separately;
- taxonomy conflicts and impossible structured facts;
- normalized metadata and image-fingerprint duplicate groups;
- low-confidence analysis;
- a deduplicated manual-review list;
- field completeness and an aggregate quality indicator.

Blank optional fields are described as opportunities, not errors. This
preserves the product’s existing promise that brand, size, color, and other
details may remain blank.

## Metadata Enrichment

The AI enrichment pipeline emits a provenance-bearing overlay. It never writes
to canonical wardrobe fields.

- Existing values are protected as confirmed data.
- Missing-field inference at or above `0.70` is stored as `inferred`.
- Lower-confidence inference is stored as `needs_review`.
- Null or unsupported inference is ignored.
- Recommendation generation does not consume this overlay yet.

The enrichment endpoint is protected by the same server-side founder allowlist
as the dashboard and is rate-limited.

## Outfit Knowledge Graph Foundation

The graph stores user-scoped item-to-item evidence for:

- successful combinations;
- incompatible combinations;
- frequently worn combinations;
- occasion-specific combinations;
- color relationships;
- footwear relationships.

Every edge carries confidence, evidence count, source record IDs, context, and
version. No recommendation code reads these edges in this phase.

## Founder Dashboard

The unlinked route `/internal/recommendation-diagnostics` is:

- disabled unless `FOUNDER_DIAGNOSTICS_ENABLED=true`;
- restricted to `FOUNDER_DIAGNOSTICS_EMAILS`;
- authenticated on the server;
- owner-scoped even for an authorized founder;
- marked `noindex`, `nofollow`, and `nocache`;
- absent from customer navigation.

The dashboard shows recent traces, wardrobe metadata quality, Style Profile and
Wardrobe Evidence summaries, recommendation confidence, engine version,
feature flags, enrichment status, and graph counts.

## Brand alignment

The framework strengthens Curated’s standards of explainability, privacy,
discretion, and honest uncertainty. The internal surface is called “The Study”
and uses the house’s editorial hierarchy, but remains usable without decorative
elements. It does not create customer surveillance, cross-user access, false
certainty, or engagement pressure.
