# Legacy Correction Copy and Authority Audit

Status: non-deployed audit, 2026-08-02. This review used source and schema only. No customer records, private prompts, schedules, addresses, or wardrobe contents were inspected.

## Authority classes

- **Applied to this consultation**: transient UI or regeneration state; no durable memory claim.
- **Saved for this event or today**: persisted on the owner-scoped daily event or worn-history record.
- **Remembered for similar contexts**: persisted owner-scoped preference with a contextual key and successful write confirmation.
- **Suppressed until restored**: active owner-scoped suppression record with revision, restoration, and cache invalidation.

## Customer-facing inventory

| Customer-facing statement | Source | Actual legacy authority | Classification | Finding |
|---|---|---|---|---|
| “Corrections apply to today unless you ask Curated to remember them.” | `app/today/_components/recommendation-follow-up.tsx` | Event note is appended when the event write succeeds; durable behavior depends on separate parsing/writes. | Saved for this event or today | Partly accurate, but “remember” does not describe scope, persistence result, or restoration. |
| “Curated heard the correction and is composing three new looks…” | same | Submission was accepted client-side; regeneration may still fail. | Applied to this consultation | Acceptable as transient acknowledgement; it is not a memory claim. |
| “Your correction has been applied to three new outfit options.” | same | Event correction persisted and regeneration returned options. | Saved for this event or today | Accurate only for this event; it should not be interpreted as durable similar-context memory. |
| “Your correction was saved, but the new looks could not be completed.” | same | Event note may have persisted; the phrase does not identify event-only scope. | Saved for this event or today | Scope is understated and can be mistaken for durable memory. |
| “Your styling preference was saved for future recommendations.” | same | `pairPreferenceSaved` is true only after the pair-preference write succeeds. | Remembered for similar contexts | Persistence-conditioned, but “future recommendations” is broader than the stored pairing/context contract. |
| “I’ve kept that correction with this event. I’m rebuilding…” | `app/api/recommendations/[id]/follow-up/route.ts` | Returned only when the daily-event notes update succeeds. | Saved for this event or today | Correctly scoped to the event. |
| “I’ve kept that correction with this event. I’ll use it when rebuilding the options.” | same | Event-only persistence; rebuild may subsequently fail. | Saved for this event or today | Correct scope, but does not distinguish persisted correction from successful regeneration. |
| “Remembered for today.” | `app/today/_components/today-workspace.tsx` | Worn-history persistence completed; this is not correction or suppression memory. | Saved for this event or today | Ambiguous wording risks implying broader recommendation memory. |

## Persistence gaps and latent Production trust risk

1. The legacy follow-up route can attempt a durable style-preference insert, catch its failure, and continue. Its response does not expose a durable-preference persistence result distinct from the event-note result.
2. Legacy event notes provide event-scoped continuity, not an authoritative item-suppression contract. They do not provide until-restored state, restoration history, or suppression revision identity.
3. Legacy cache and candidate generation do not consume the V2 suppression authority model. Copy must therefore not imply that an item is suppressed across primary results, alternatives, regeneration, cached results, consultation, and explanations.
4. The current Production architecture shares these source-level limitations. This is a latent trust risk, not evidence about any unrelated customer record.

No Production copy is changed by this audit.
