import { RECOMMENDATION_ENGINE_VERSION } from "@/lib/recommendations/engine-version";
import {
  RECOMMENDATION_ARCHITECTURE_V2,
  RECOMMENDATION_V2_SCHEMA_REGISTRY,
} from "./registry";

export const RECOMMENDATION_CONTINUITY_MANIFEST = {
  manifestVersion: "recommendation-continuity.v1",
  currentPreview: {
    architecture: "current",
    engineVersion: RECOMMENDATION_ENGINE_VERSION,
    behaviorFrozen: true,
    remainsAvailable: true,
  },
  production: {
    architecture: "current",
    engineVersion: RECOMMENDATION_ENGINE_VERSION,
    behaviorFrozen: true,
    deploymentAuthorized: false,
  },
  v2Evaluation: {
    architecture: RECOMMENDATION_ARCHITECTURE_V2,
    defaultMode: false,
    founderOnly: true,
    enabled: false,
    safelyDisableable: true,
    exposedPhaseCapabilities: [] as string[],
    registry: RECOMMENDATION_V2_SCHEMA_REGISTRY,
  },
  rollback: {
    target: "current-preview",
    requiresDataRewrite: false,
    v2WritesIsolated: true,
  },
} as const;

export const RECOMMENDATION_CONTINUITY_VERIFICATION = {
  currentPreviewRouting: {
    status: "verified-by-source-test",
    assertion: "Current application routes do not import the V2 package.",
  },
  productionRouting: {
    status: "verified-by-source-test",
    assertion: "No V2 route or default mode is registered.",
  },
  v2FeatureFlag: {
    status: "implemented-fail-closed",
    assertion: "V2 Evaluation requires Product authorization, an isolated non-Production host, and an authenticated Founder allowlist; it remains disabled.",
  },
  v2CacheIsolation: {
    status: "verified-by-unit-test",
    assertion: "Namespaces include owner, request, architecture, taxonomy, contract, and all revision identities.",
  },
  phaseOnePersistence: {
    status: "implemented-isolated",
    assertion: "Phase 1 correction and suppression contracts remain outside current application routes and use owner-scoped versioned persistence.",
  },
} as const;

export const RECOMMENDATION_ENGINE_DISPOSITION = {
  retained: [
    "DailyAgenda ingestion",
    "authenticated owner-scoped wardrobe reads",
    "weather and venue evidence collection",
    "garment evidence enrichment",
    "diagnostic trace storage",
  ],
  moved: [
    "correction authority and scope normalization",
    "customer dressing brief normalization",
    "Personal Outfit Memory projection",
    "Dressing Posture resolution before retrieval",
  ],
  demoted: [
    "aggregate score as final selection authority",
    "Cartesian candidate generation",
  ],
  frozenUntilReplacementProven: [
    "lib/recommendations/engine/governed-engine.ts",
    "current Preview recommendation routes",
    "Production recommendation routes",
  ],
} as const;

export const RECOMMENDATION_EVALUATION_CORPORA = {
  founder: "founder-validation-suite.2026-07-29",
  broaderCustomer: "multi-customer-validation.v1",
} as const;
