import type { VenueRule } from "./types";

type VenueDefinition = {
  matches: RegExp;
  sources: Array<{ url: string; kind: VenueRule["kind"] }>;
  verifiedFallback?: Omit<VenueRule, "retrievedAt">;
};

const VENUES: VenueDefinition[] = [{
  matches: /\btruist park\b|\batlanta braves\b/i,
  sources: [
    { url: "https://www.mlb.com/braves/ballpark/bag-policy", kind: "bag-policy" },
    { url: "https://www.mlb.com/braves/ballpark/security", kind: "security" },
  ],
}, {
  matches: /\bmercedes[- ]benz stadium\b/i,
  sources: [
    { url: "https://www.mercedesbenzstadium.com/guidelines", kind: "bag-policy" },
  ],
  verifiedFallback: {
    kind: "bag-policy",
    statement: "If a bag is necessary, it must be stadium-compliant: clear plastic, vinyl, or PVC within 12 × 6 × 12 inches, or a qualifying very small non-clear bag.",
    effect: "clear-bag-only",
    sourceUrl: "https://www.mercedesbenzstadium.com/guidelines",
    confidence: "high",
  },
}];

const OFFICIAL_HOSTS = new Set(["www.mlb.com", "www.mercedesbenzstadium.com"]);
const MAX_BYTES = 750_000;
const TIMEOUT_MS = 3_000;

function policyFromOfficialText(kind: VenueRule["kind"], text: string, url: string, retrievedAt: string): VenueRule | null {
  const normalized = text.replace(/\s+/g, " ");
  if (
    kind === "bag-policy" &&
    /bags? (?:that )?are clear plastic, vinyl or pvc/i.test(normalized) &&
    /12[”"']?\s*x\s*6[”"']?\s*x\s*12/i.test(normalized)
  ) {
    return {
      kind,
      statement: "If a bag is necessary, it must be stadium-compliant: clear plastic, vinyl, or PVC within 12 × 6 × 12 inches, or a qualifying very small non-clear bag.",
      effect: "clear-bag-only",
      sourceUrl: url,
      retrievedAt,
      confidence: "high",
    };
  }
  if (kind === "bag-policy" && /bags are not allowed to enter truist park/i.test(normalized)) {
    return {
      kind,
      statement: "Bags are not generally allowed; the official policy lists limited exceptions, including small qualifying clutches or clear bags.",
      effect: "no-bag",
      sourceUrl: url,
      retrievedAt,
      confidence: "high",
    };
  }
  return null;
}

export async function researchVenue(location: string | null, now = new Date()): Promise<VenueRule[]> {
  if (!location) return [];
  const venue = VENUES.find((candidate) => candidate.matches.test(location));
  if (!venue) return [];
  const retrievedAt = now.toISOString();
  const results: VenueRule[] = [];
  for (const source of venue.sources) {
    const parsed = new URL(source.url);
    if (parsed.protocol !== "https:" || !OFFICIAL_HOSTS.has(parsed.hostname)) continue;
    try {
      const response = await fetch(parsed, {
        redirect: "error",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { Accept: "text/html", "User-Agent": "CuratedVenueResearch/1.0" },
        next: { revalidate: 21_600 },
      });
      if (!response.ok || !response.body) continue;
      const declaredLength = Number(response.headers.get("content-length") || 0);
      if (declaredLength > MAX_BYTES) continue;
      const text = (await response.text()).slice(0, MAX_BYTES);
      const rule = policyFromOfficialText(source.kind, text, source.url, retrievedAt);
      if (rule) results.push(rule);
    } catch {
      // Venue research is an enhancement. Unknown is safer than an invented rule.
    }
  }
  if (!results.length && venue.verifiedFallback) {
    results.push({ ...venue.verifiedFallback, retrievedAt });
  }
  return results;
}
