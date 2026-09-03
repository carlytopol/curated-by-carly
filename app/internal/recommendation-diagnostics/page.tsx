import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFounderDiagnosticsIdentity } from "@/lib/auth/founder-diagnostics";
import { getFounderDashboardData } from "@/lib/recommendations/diagnostics/dashboard-data";
import { EnrichmentControls } from "./enrichment-controls";

export const metadata: Metadata = {
  title: "The Study | Curated",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

const pretty = (value: unknown) => JSON.stringify(value, null, 2);

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-[#c8b487]/60 bg-[#fffaf1]/80 p-5">
      <dt className="text-[0.68rem] uppercase tracking-[0.24em] text-[#8b6c36]">{label}</dt>
      <dd className="mt-2 font-serif text-3xl text-[#183b31]">{value}</dd>
    </div>
  );
}

export default async function RecommendationDiagnosticsPage() {
  const identity = await getFounderDiagnosticsIdentity();
  if (!identity?.id) notFound();
  const data = await getFounderDashboardData(identity.id);
  const trace = data.latestDiagnostic;

  return (
    <main className="min-h-screen bg-[#f4efe5] px-5 py-12 text-[#263d35] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs uppercase tracking-[0.3em] text-[#9c763c]">Private house notes</p>
        <div className="mt-4 border-b border-[#bca676]/60 pb-8">
          <h1 className="font-serif text-5xl leading-none sm:text-7xl">The Study</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#53645e]">
            A private, owner-scoped view of how Curated reached its conclusions.
            This page is unlinked, server-authorized, and excluded from search.
          </p>
        </div>

        {data.infrastructureWarnings.length > 0 && (
          <section className="mt-8 border-l-2 border-[#8d344f] bg-[#fff8f5] p-5" aria-label="Infrastructure notes">
            {data.infrastructureWarnings.map((warning) => <p key={warning}>{warning}</p>)}
          </section>
        )}

        <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Engine" value={data.engineVersion} />
          <Stat label="Wardrobe quality" value={`${data.metadataAudit.qualityScore}%`} />
          <Stat label="Items reviewed" value={data.metadataAudit.itemCount} />
          <Stat label="Manual review" value={data.metadataAudit.itemsNeedingManualReview.length} />
        </dl>

        <EnrichmentControls wardrobeItemCount={data.metadataAudit.itemCount} />

        <section className="mt-12 grid gap-8 lg:grid-cols-2">
          <article className="border-t border-[#bca676] pt-5">
            <h2 className="font-serif text-3xl">Wardrobe metadata</h2>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div><dt>Missing fields</dt><dd className="font-serif text-2xl">{data.metadataAudit.missingMetadata.length}</dd></div>
              <div><dt>Conflicts</dt><dd className="font-serif text-2xl">{data.metadataAudit.conflictingMetadata.length}</dd></div>
              <div><dt>Duplicate groups</dt><dd className="font-serif text-2xl">{data.metadataAudit.duplicateItems.length}</dd></div>
              <div><dt>Low confidence</dt><dd className="font-serif text-2xl">{data.metadataAudit.lowConfidenceClassifications.length}</dd></div>
              <div><dt>Inferred overlays</dt><dd className="font-serif text-2xl">{data.suggestionSummary.inferred}</dd></div>
              <div><dt>Needs review</dt><dd className="font-serif text-2xl">{data.suggestionSummary.needsReview}</dd></div>
            </dl>
            <details className="mt-6">
              <summary className="cursor-pointer underline decoration-[#bca676] underline-offset-4">Open complete audit</summary>
              <pre className="mt-4 max-h-[32rem] overflow-auto bg-[#1d352d] p-4 text-xs leading-5 text-[#f5ecdc]">{pretty(data.metadataAudit)}</pre>
            </details>
          </article>

          <article className="border-t border-[#bca676] pt-5">
            <h2 className="font-serif text-3xl">Style continuity</h2>
            <dl className="mt-5 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt>Profile status</dt><dd>{data.styleProfile.status}</dd></div>
              <div className="flex justify-between gap-4"><dt>Profile version</dt><dd>{data.styleProfile.version ?? "Neutral"}</dd></div>
              <div className="flex justify-between gap-4"><dt>Resolved preferences</dt><dd>{data.styleProfile.explicitOrResolvedPreferenceCount}</dd></div>
              <div className="flex justify-between gap-4"><dt>Learning permitted</dt><dd>{data.styleProfile.learningEnabled ? "Yes" : "No"}</dd></div>
            </dl>
            <details className="mt-6">
              <summary className="cursor-pointer underline decoration-[#bca676] underline-offset-4">Open wardrobe evidence</summary>
              <pre className="mt-4 max-h-[32rem] overflow-auto bg-[#1d352d] p-4 text-xs leading-5 text-[#f5ecdc]">{pretty(data.wardrobeEvidence)}</pre>
            </details>
          </article>
        </section>

        <section className="mt-12 border-t border-[#bca676] pt-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#9c763c]">Recommendation inspector</p>
              <h2 className="mt-2 font-serif text-4xl">Latest trace</h2>
            </div>
            <p className="text-sm">Confidence: {data.recommendationConfidence?.level ?? "No trace yet"}</p>
          </div>
          {trace ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <details open className="border border-[#c8b487]/60 bg-[#fffaf1]/70 p-5">
                <summary className="cursor-pointer font-serif text-xl">Policy & evidence</summary>
                <pre className="mt-4 max-h-[38rem] overflow-auto text-xs leading-5">{pretty({
                  eventPolicy: trace.eventPolicy,
                  weather: trace.weatherInputs,
                  venue: trace.venueInputs,
                  styleProfile: trace.styleProfileInputs,
                  interpretation: trace.personalStyleInterpretationInputs,
                })}</pre>
              </details>
              <details open className="border border-[#c8b487]/60 bg-[#fffaf1]/70 p-5">
                <summary className="cursor-pointer font-serif text-xl">Candidates & rejections</summary>
                <pre className="mt-4 max-h-[38rem] overflow-auto text-xs leading-5">{pretty({
                  considered: trace.candidateOutfits,
                  rejectedCount: trace.rejectedCandidateCount,
                  truncated: trace.candidateTraceTruncated,
                  itemEligibility: trace.itemEligibilityAudit,
                })}</pre>
              </details>
              <details open className="border border-[#c8b487]/60 bg-[#fffaf1]/70 p-5">
                <summary className="cursor-pointer font-serif text-xl">Final edit & scores</summary>
                <pre className="mt-4 max-h-[38rem] overflow-auto text-xs leading-5">{pretty({
                  final: trace.finalRecommendations,
                  confidence: trace.overallConfidence,
                  noRecommendationReason: trace.noRecommendationReason,
                })}</pre>
              </details>
            </div>
          ) : (
            <p className="mt-5 border border-dashed border-[#bca676] p-6">
              No recommendation trace has been recorded yet.
            </p>
          )}
        </section>

        <section className="mt-12 grid gap-8 border-t border-[#bca676] pt-5 lg:grid-cols-2">
          <article>
            <h2 className="font-serif text-3xl">Knowledge graph foundation</h2>
            <pre className="mt-4 bg-[#fffaf1]/70 p-4 text-xs leading-5">{pretty(data.graphCounts)}</pre>
          </article>
          <article>
            <h2 className="font-serif text-3xl">Feature flags</h2>
            <pre className="mt-4 bg-[#fffaf1]/70 p-4 text-xs leading-5">{pretty(data.featureFlags)}</pre>
          </article>
        </section>
      </div>
    </main>
  );
}
