import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildCustomerDressingBrief } from "./customer-dressing-brief";
import { SupabaseCustomerMemoryStateRepository } from "./customer-memory-state-repository";
import { projectPersonalOutfitMemory } from "./personal-outfit-memory";
import {
  RECOMMENDATION_ENGINE_V2_VERSION,
  RECOMMENDATION_V2_CACHE_NAMESPACE,
  runRecommendationV2WithLazyWardrobe,
} from "./engine";
import type {
  ComparativeJudgment,
  StyleProfileProjection,
  WardrobeGarment,
} from "./recommendation-pipeline";
import {
  EVIDENCE_REFERENCE_VERSION,
  type EvidenceRef,
  type FormalityLevel,
  type GarmentRole,
  type MaterialId,
  type OutfitFoundationKind,
} from "./taxonomy";
import {
  CUSTOMER_DRESSING_BRIEF_VERSION,
  DRESSING_POSTURE_VERSION,
  STYLIST_ADJUDICATION_VERSION,
} from "./contracts";
import { RECOMMENDATION_ARCHITECTURE_V2 } from "./registry";
import { assertPersistableRecommendationLooks } from "./persistable-looks";
import { classifyCanonicalWardrobeRole } from "./wardrobe-role";

export const RECOMMENDATION_ARCHITECTURE_V2_VERSION = RECOMMENDATION_ARCHITECTURE_V2;

type EventRow = {
  id: string; event_date: string; starts_at: string | null; title: string;
  location: string | null; dress_code: string | null; notes: string | null;
};

type ClosetRow = {
  id: string; designer: string | null; item_name: string | null; category: string | null;
  subcategory: string | null; subcategory_2: string | null; color: string | null;
  season: string | null; styling_suggestion: string | null; analysis_metadata: unknown;
  availability_status: string | null; unavailable_until: string | null;
};

type ProfileRow = { style_notes: string | null; fit_notes: string | null; proportions: string | null };

function evidence(input: Omit<EvidenceRef, "schemaVersion" | "sourceVersion" | "effectiveFrom" | "effectiveUntil">): EvidenceRef {
  return { ...input, schemaVersion: EVIDENCE_REFERENCE_VERSION, sourceVersion: "main-app.v2.1.0", effectiveFrom: input.observedAt, effectiveUntil: null };
}

function text(row: ClosetRow) {
  return [row.designer, row.item_name, row.category, row.subcategory, row.subcategory_2, row.color, row.season, row.styling_suggestion, JSON.stringify(row.analysis_metadata ?? {})]
    .filter(Boolean).join(" ").toLowerCase();
}

function foundation(role: GarmentRole): OutfitFoundationKind | null {
  if (role === "dress") return "dress";
  if (role === "jumpsuit") return "jumpsuit";
  if (role === "coordinated-set") return "coordinated-set";
  if (role === "top" || role === "bottom") return "top-bottom";
  return null;
}

function formality(value: string): FormalityLevel {
  if (/\b(gown|black tie|ceremonial)\b/.test(value)) return "ceremonial";
  if (/\b(formal|evening|cocktail|sequin|tuxedo)\b/.test(value)) return "formal";
  if (/\b(satin|silk|dressy|embellished)\b/.test(value)) return "dressy";
  if (/\b(blazer|tailored|professional|business)\b/.test(value)) return "professional";
  if (/\b(tee|t-shirt|graphic|utility|activewear|sweat|hoodie)\b/.test(value)) return "casual";
  return "polished-casual";
}

function materials(value: string): MaterialId[] {
  const result: MaterialId[] = [];
  if (/\bcotton\b/.test(value)) result.push("cotton");
  if (/\blinen\b/.test(value)) result.push("linen");
  if (/\b(jean|denim)\b/.test(value)) result.push(/\b(short|light|chambray)\b/.test(value) ? "denim-light" : "denim-heavy");
  if (/\bsilk\b/.test(value)) result.push("silk");
  if (/\bsatin|charmeuse\b/.test(value)) result.push("satin");
  if (/\bsuede\b/.test(value)) result.push("suede");
  if (/\bleather\b/.test(value)) result.push("leather");
  return result;
}

function mapGarment(ownerUserId: string, row: ClosetRow, suppressed: Set<string>, now: string): WardrobeGarment | null {
  const value = text(row);
  const role = classifyCanonicalWardrobeRole({
    category: row.category,
    subcategory: row.subcategory,
    subcategory2: row.subcategory_2,
    itemName: row.item_name,
  });
  if (!role) return null;
  const unavailableUntil = row.unavailable_until ? new Date(row.unavailable_until).getTime() : 0;
  const available = (!row.availability_status || row.availability_status === "available")
    && (!row.unavailable_until || unavailableUntil <= Date.now());
  const walkability = role !== "shoes" ? null : /\b(sneaker|loafer|flat|walking|comfortable sandal)\b/.test(value) ? "high" : /\b(pump|stiletto|high heel|boot)\b/.test(value) ? "low" : "moderate";
  const securePockets = /\b(pocket|pockets)\b/.test(value) ? true : null;
  const genres: WardrobeGarment["genres"] = /\b(cocktail)\b/.test(value) ? ["cocktail"] : /\b(evening|gown)\b/.test(value) ? ["evening"] : /\b(active|workout|sweat)\b/.test(value) ? ["activewear"] : ["everyday"];
  return {
    ownerUserId, itemId: row.id,
    name: [row.designer, row.item_name].filter(Boolean).join(" — ") || "Wardrobe piece",
    role, foundationKind: foundation(role), available, suppressed: suppressed.has(row.id),
    formality: formality(value), materials: materials(value), silhouettes: ["balanced"],
    palettes: ["neutral"], genres, securePockets, walkability,
    descriptors: value.split(/\s+/).filter(Boolean),
    evidenceRefs: [evidence({ evidenceId: `wardrobe:${row.id}`, ownerUserId, authority: "canonical-fact", sourceType: "wardrobe-item", confidence: "high", observedAt: now })],
  };
}

function judgments(validated: Parameters<Parameters<typeof runRecommendationV2WithLazyWardrobe>[0]["adjudicate"]>[0]): ComparativeJudgment[] {
  return validated.validated.map((entry, index) => ({
    lookId: entry.look.artifactId,
    comparativeRank: index + 1,
    reality: entry.passed ? "pass" : "fail",
    personalPlausibility: entry.passed ? "pass" : "fail",
    effort: entry.passed ? "pass" : "fail",
    coherence: entry.passed ? "pass" : "fail",
    restraint: entry.passed ? "pass" : "fail",
    editorial: entry.passed ? "pass" : "fail",
    decisiveReasonCodes: entry.passed ? [] : ["editorial-rejection"],
  }));
}

function optionCopy(items: WardrobeGarment[]) {
  const labels = items.map((item) => item.name);
  return {
    summary: labels.join(", "),
    rationale: `A complete look selected for the day’s formality, movement, weather, and your current instructions: ${labels.join(", ")}.`,
  };
}

export async function generateMainAppV2Recommendation(input: {
  client: SupabaseClient; userId: string; eventId: string; requestContext: Record<string, unknown> | null;
}) {
  const now = new Date().toISOString();
  const requestId = randomUUID();
  const { data: event, error: eventError } = await input.client.from("daily_events")
    .select("id,event_date,starts_at,title,location,dress_code,notes")
    .eq("id", input.eventId).eq("user_id", input.userId).maybeSingle<EventRow>();
  if (eventError) throw eventError;
  if (!event) return { status: 404, body: { error: "Event not found." } };

  const context = {
    ownerUserId: input.userId, localDate: event.event_date, timezone: "America/New_York",
    dailyEventId: event.id, occasion: null, dayCharacter: null, socialStakes: null,
  } as const;
  const memoryState = await new SupabaseCustomerMemoryStateRepository(input.client, input.userId)
    .resolve({ context, requestId, generatedAt: now });
  const currentRef = evidence({ evidenceId: `event:${event.id}:${requestId}`, ownerUserId: input.userId, authority: "customer-current", sourceType: "customer-statement", confidence: "high", observedAt: now });
  const correctionStatements = memoryState.corrections.map((record) => ({
    text: record.originalLanguage,
    evidenceRef: memoryState.activeCorrectionRefs.find((ref) => ref.correctionId === record.id)!.evidenceRef,
  }));
  const intention = typeof input.requestContext?.intention === "string" ? input.requestContext.intention : "";
  const brief = buildCustomerDressingBrief({
    artifactId: `${event.id}:brief`, artifactRevision: "1", requestId, ownerUserId: input.userId, generatedAt: now,
    statements: [{ text: [event.title, event.dress_code, event.notes, intention].filter(Boolean).join(". "), evidenceRef: currentRef }, ...correctionStatements],
    activeCorrections: memoryState.activeCorrectionRefs, activeSuppressions: memoryState.activeSuppressionRefs,
  });
  const eventPolicy = {
    schemaVersion: "event-policy-result.v2.3.0" as const, artifactId: `${event.id}:policy`, artifactRevision: "1",
    requestId, ownerUserId: input.userId, generatedAt: now, requiredRoles: ["shoes" as const], prohibitedRoles: [],
    confirmedVenueProhibitions: [], confirmedActivityRequirements: [], evidenceRefs: [currentRef],
  };
  const weatherValue = (input.requestContext?.weather ?? input.requestContext ?? {}) as Record<string, unknown>;
  const number = (...keys: string[]) => { for (const key of keys) if (typeof weatherValue[key] === "number") return weatherValue[key] as number; return null; };
  const weather = { temperatureF: number("temperatureF", "temperature", "temp"), feelsLikeF: number("feelsLikeF", "feelsLike"), humidityPercent: number("humidityPercent", "humidity"), precipitationProbability: number("precipitationProbability", "precipitation"), windMph: number("windMph", "wind"), daylight: typeof weatherValue.daylight === "boolean" ? weatherValue.daylight : null, evidenceRefs: [] };
  const memory = projectPersonalOutfitMemory({ artifactId: `${event.id}:memory`, artifactRevision: "1", requestId, ownerUserId: input.userId, generatedAt: now, observations: [] });
  const { data: profile, error: profileError } = await input.client.from("user_profiles")
    .select("style_notes,fit_notes,proportions").eq("user_id", input.userId).maybeSingle<ProfileRow>();
  if (profileError) throw profileError;
  const profileEvidence = profile && [profile.style_notes, profile.fit_notes, profile.proportions].some(Boolean)
    ? [evidence({ evidenceId: `profile:${input.userId}`, ownerUserId: input.userId, authority: "customer-durable", sourceType: "profile", confidence: "high", observedAt: now })]
    : [];
  const style: StyleProfileProjection = { ownerUserId: input.userId, revision: "canonical-profile-read-v1", preferredFoundations: [], silhouettes: [], palettes: [], materials: [], avoidedItemIds: [], preferredItemIds: [], evidenceRefs: profileEvidence };
  const suppressed = new Set(memoryState.activeSuppressionRefs.map((item) => item.itemId));
  const result = await runRecommendationV2WithLazyWardrobe({
    generatedAt: now, brief, eventPolicy, weather, memory, style,
    correctionStateRef: memoryState.correctionStateRef, suppressionStateRef: memoryState.suppressionStateRef,
    adjudicate: judgments,
    loadWardrobe: async () => {
      const { data, error } = await input.client.from("clothing_items")
        .select("id,designer,item_name,category,subcategory,subcategory_2,color,season,styling_suggestion,analysis_metadata,availability_status,unavailable_until")
        .eq("user_id", input.userId);
      if (error) throw error;
      return (data as ClosetRow[]).map((row) => mapGarment(input.userId, row, suppressed, now)).filter((item): item is WardrobeGarment => Boolean(item));
    },
  });
  if (result.outcome.outcome !== "recommend") {
    return { status: 422, body: { error: result.outcome.outcome === "ask-one-question" ? result.outcome.question : "Curated could not find a complete look that responsibly suits this day.", engineVersion: RECOMMENDATION_ENGINE_V2_VERSION, architectureVersion: RECOMMENDATION_ARCHITECTURE_V2_VERSION } };
  }
  const looks = [result.outcome.selected, result.outcome.challenger].filter((look): look is NonNullable<typeof look> => Boolean(look));
  assertPersistableRecommendationLooks(looks, input.userId);
  const idempotencyKey = `${event.id}:${memoryState.revisions.correctionRevision}:${memoryState.revisions.suppressionRevision}:${RECOMMENDATION_ENGINE_V2_VERSION}`;
  const payload = {
    userId: input.userId, dailyEventId: event.id, requestId, idempotencyKey,
    engineVersion: RECOMMENDATION_ENGINE_V2_VERSION, architectureVersion: RECOMMENDATION_ARCHITECTURE_V2_VERSION,
    briefVersion: CUSTOMER_DRESSING_BRIEF_VERSION, postureVersion: DRESSING_POSTURE_VERSION, adjudicationVersion: STYLIST_ADJUDICATION_VERSION,
    correctionRevision: memoryState.revisions.correctionRevision, suppressionRevision: memoryState.revisions.suppressionRevision,
    outcome: result.outcome.outcome, customerSummary: "A considered edit for this day.", postureArtifact: result.trace.posture,
    adjudicationArtifact: { outcome: result.outcome.outcome, judgments: result.trace.judgments }, traceArtifact: result.trace,
    options: looks.map((look, optionIndex) => ({ optionIndex, ...optionCopy(look.items), candidateArtifact: look, items: look.items.map((item, position) => ({ itemId: item.itemId, garmentRole: item.role, position })) })),
  };
  const { data: runId, error: persistError } = await input.client.rpc("persist_recommendation_run_v2", { payload });
  if (persistError) throw persistError;
  const options = looks.map((look, optionIndex) => ({
    id: `${runId}:${optionIndex}`, ...optionCopy(look.items), status: "suggested", optionIndex,
    wardrobeItems: look.items.map((item) => ({ id: item.itemId, label: item.name, category: item.role })),
  }));
  const { error: cacheError } = await input.client.rpc("put_recommendation_cache_v2", { payload: {
    userId: input.userId,
    runId,
    partitionKey: `${RECOMMENDATION_V2_CACHE_NAMESPACE}:${input.userId}:${event.id}`,
    engineVersion: RECOMMENDATION_ENGINE_V2_VERSION,
    architectureVersion: RECOMMENDATION_ARCHITECTURE_V2_VERSION,
    briefVersion: CUSTOMER_DRESSING_BRIEF_VERSION,
    postureVersion: DRESSING_POSTURE_VERSION,
    adjudicationVersion: STYLIST_ADJUDICATION_VERSION,
    correctionRevision: memoryState.revisions.correctionRevision,
    suppressionRevision: memoryState.revisions.suppressionRevision,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  } });
  if (cacheError) throw cacheError;
  return { status: 200, body: { engineVersion: RECOMMENDATION_ENGINE_V2_VERSION, architectureVersion: RECOMMENDATION_ARCHITECTURE_V2_VERSION, recommendationSetId: runId, confidence: result.trace.posture.confidence, unknowns: [], options } };
}
