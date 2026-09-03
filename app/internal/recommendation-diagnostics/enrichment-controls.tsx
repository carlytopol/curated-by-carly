"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BatchResult = {
  processedItemCount?: number;
  acceptedInferenceCount?: number;
  needsReviewCount?: number;
  protectedConfirmedFieldCount?: number;
  error?: string;
};

type RunSummary = {
  batches: number;
  processed: number;
  inferred: number;
  needsReview: number;
  protectedFields: number;
};

const EMPTY_SUMMARY: RunSummary = {
  batches: 0,
  processed: 0,
  inferred: 0,
  needsReview: 0,
  protectedFields: 0,
};

export function EnrichmentControls({ wardrobeItemCount }: { wardrobeItemCount: number }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<RunSummary>(EMPTY_SUMMARY);
  const [message, setMessage] = useState<string | null>(null);

  async function runEnrichment() {
    if (running) return;
    setRunning(true);
    setMessage("The wardrobe archivist is reviewing the collection in private.");
    let nextSummary = EMPTY_SUMMARY;
    const batchCount = Math.ceil(wardrobeItemCount / 10);

    try {
      for (let batch = 0; batch < batchCount; batch += 1) {
        const response = await fetch("/api/internal/wardrobe-metadata/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 10 }),
        });
        const result = await response.json() as BatchResult;
        if (!response.ok) {
          throw new Error(result.error ?? "The archive review paused before it was complete.");
        }
        nextSummary = {
          batches: nextSummary.batches + 1,
          processed: nextSummary.processed + (result.processedItemCount ?? 0),
          inferred: nextSummary.inferred + (result.acceptedInferenceCount ?? 0),
          needsReview: nextSummary.needsReview + (result.needsReviewCount ?? 0),
          protectedFields: nextSummary.protectedFields + (result.protectedConfirmedFieldCount ?? 0),
        };
        setSummary(nextSummary);
        setMessage(`Reviewed ${Math.min(nextSummary.processed, wardrobeItemCount)} of ${wardrobeItemCount} pieces.`);
      }
      setMessage("The archive review is complete. Confirmed details were left exactly as you entered them.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The archive review paused before it was complete.");
      router.refresh();
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="mt-8 border border-[#c8b487]/60 bg-[#fffaf1]/80 p-5" aria-live="polite">
      <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[#8b6c36]">Private archive review</p>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#53645e]">
        Curated may add high-confidence evidence beside a piece. Your confirmed wardrobe details remain authoritative,
        and uncertain observations are reserved for your review.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={runEnrichment}
          disabled={running}
          className="bg-[#183b31] px-5 py-3 text-sm text-[#fffaf1] disabled:cursor-wait disabled:opacity-60"
        >
          {running ? "Reviewing the collection…" : "Review the collection"}
        </button>
        {message && <p className="text-sm text-[#6f4a57]">{message}</p>}
      </div>
      {summary.batches > 0 && (
        <p className="mt-4 text-xs leading-5 text-[#53645e]">
          {summary.inferred} high-confidence observations · {summary.needsReview} held for review ·{" "}
          {summary.protectedFields} confirmed fields protected
        </p>
      )}
    </section>
  );
}
