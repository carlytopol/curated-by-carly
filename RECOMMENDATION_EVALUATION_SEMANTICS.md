# Recommendation Evaluation Semantics

## Two different meanings of “passed”

1. **Legacy characterization passed** means the regression detector reproduced and identified the known blocked failure. It does **not** mean the legacy engine passed suppression, alternative-quality, or recommendation-quality requirements.
2. **V2 contract passed** means the governed V2 path satisfied an intended requirement through deterministic assertions.

The sanitized legacy fixture is `tests/fixtures/recommendations/date-night-suppression-legacy.json`. Its characterization test is `tests/recommendation-legacy-date-night-characterization.test.ts`.

The V2 contract evidence lives in:

- `tests/recommendation-v2-pipeline.test.ts`: authoritative suppression before retrieval, suppression across initial retrieval and regeneration, fewer independently viable options, optional support pieces, and no suppressed item in consultation/explanation inputs.
- `tests/recommendation-v2-consultation.test.ts`: one canonical submission path and no “saved,” “applied,” or “remembered” claim after failed persistence.
- `tests/recommendation-v2-contracts.test.ts`: owner/version/provenance validation, centrally disqualifying suppression, and evidence-backed explanation facts.
- `tests/recommendation-v2-customer-isolation.test.ts`: customer isolation.

These tests are release evidence for V2 contracts. They do not activate V2, alter the legacy engine, or make the current Founder Preview a V2 recommendation-quality environment.

## Repeat observation — 2026-08-02

Founder retesting of the operational Current Preview reproduced the already characterized legacy failures: an earlier item-suppression instruction was not authoritatively enforced, outfit foundations did not satisfy the day, and the same optional support item was appended across alternatives. This is additional evidence for the existing blocked legacy characterization, not a separate incident. No further recommendation-quality testing or repeated correction entry is expected in Current Preview.

Current Preview remains available for workflow checks. Recommendation-quality testing resumes only in a separately labeled Founder-only V2 Evaluation environment after its gates pass. This observation authorizes no V2 activation, Preview replacement, or Production deployment.
