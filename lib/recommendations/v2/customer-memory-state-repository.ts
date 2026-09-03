import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CORRECTION_STATE_VERSION,
  SUPPRESSION_STATE_VERSION,
  type ScopedCorrectionReference,
  type SuppressionReference,
} from "./contracts";
import {
  CUSTOMER_MEMORY_RECORD_VERSION,
  customerMemoryScopeMatches,
  type CustomerCorrection,
  type CustomerMemoryRevisions,
  type CustomerMemoryScope,
  type RecommendationContextIdentity,
  type RecommendationSuppression,
} from "./customer-memory";
import {
  ARTIFACT_REFERENCE_VERSION,
  EVIDENCE_REFERENCE_VERSION,
  type ArtifactRef,
  type EvidenceRef,
} from "./taxonomy";

type RevisionRow = {
  user_id: string;
  correction_revision: number | string;
  suppression_revision: number | string;
};

type CorrectionRow = {
  id: string;
  user_id: string;
  status: CustomerCorrection["status"];
  scope_context: CustomerMemoryScope;
  original_language: string;
  directive: CustomerCorrection["directive"];
  authority: CustomerCorrection["authority"];
  revision: number | string;
  supersedes_record_id: string | null;
  created_at: string;
  restored_at: string | null;
};

type SuppressionRow = {
  id: string;
  user_id: string;
  item_id: string;
  status: RecommendationSuppression["status"];
  scope_context: CustomerMemoryScope;
  original_language: string;
  authority: RecommendationSuppression["authority"];
  revision: number | string;
  supersedes_record_id: string | null;
  created_at: string;
  restored_at: string | null;
};

export type ResolvedCustomerMemoryState = {
  ownerUserId: string;
  revisions: CustomerMemoryRevisions;
  corrections: CustomerCorrection[];
  suppressions: RecommendationSuppression[];
  activeCorrectionRefs: ScopedCorrectionReference[];
  activeSuppressionRefs: SuppressionReference[];
  correctionStateRef: ArtifactRef<typeof CORRECTION_STATE_VERSION>;
  suppressionStateRef: ArtifactRef<typeof SUPPRESSION_STATE_VERSION>;
};

function evidenceRef(input: {
  id: string;
  ownerUserId: string;
  authority: CustomerCorrection["authority"];
  sourceType: "correction" | "suppression";
  observedAt: string;
}): EvidenceRef {
  return {
    schemaVersion: EVIDENCE_REFERENCE_VERSION,
    evidenceId: input.id,
    ownerUserId: input.ownerUserId,
    authority: input.authority,
    sourceType: input.sourceType,
    sourceVersion: CUSTOMER_MEMORY_RECORD_VERSION,
    confidence: "high",
    observedAt: input.observedAt,
    effectiveFrom: input.observedAt,
    effectiveUntil: null,
  };
}

function stateRef<S extends typeof CORRECTION_STATE_VERSION | typeof SUPPRESSION_STATE_VERSION>(input: {
  schemaVersion: S;
  ownerUserId: string;
  requestId: string;
  revision: number;
  generatedAt: string;
}): ArtifactRef<S> {
  return {
    referenceVersion: ARTIFACT_REFERENCE_VERSION,
    artifactId: `${input.ownerUserId}:${input.schemaVersion}`,
    artifactRevision: String(input.revision),
    requestId: input.requestId,
    ownerUserId: input.ownerUserId,
    schemaVersion: input.schemaVersion,
    generatedAt: input.generatedAt,
  };
}

export function resolveCustomerMemoryRows(input: {
  context: RecommendationContextIdentity;
  requestId: string;
  generatedAt: string;
  revision: RevisionRow | null;
  correctionRows: CorrectionRow[];
  suppressionRows: SuppressionRow[];
}): ResolvedCustomerMemoryState {
  const ownerUserId = input.context.ownerUserId;
  if (input.revision && input.revision.user_id !== ownerUserId) {
    throw new Error("Customer-memory revision owner mismatch.");
  }
  if (input.correctionRows.some((row) => row.user_id !== ownerUserId)
    || input.suppressionRows.some((row) => row.user_id !== ownerUserId)) {
    throw new Error("Customer-memory state owner mismatch.");
  }

  const corrections: CustomerCorrection[] = input.correctionRows
    .filter((row) => row.status === "active" && customerMemoryScopeMatches(row.scope_context, input.context))
    .map((row) => ({
      recordVersion: CUSTOMER_MEMORY_RECORD_VERSION,
      id: row.id,
      ownerUserId: row.user_id,
      status: row.status,
      scope: row.scope_context,
      originalLanguage: row.original_language,
      directive: row.directive,
      authority: row.authority,
      revision: Number(row.revision),
      supersedesRecordId: row.supersedes_record_id,
      createdAt: row.created_at,
      restoredAt: row.restored_at,
    }));
  const suppressions: RecommendationSuppression[] = input.suppressionRows
    .filter((row) => row.status === "active" && customerMemoryScopeMatches(row.scope_context, input.context))
    .map((row) => ({
      recordVersion: CUSTOMER_MEMORY_RECORD_VERSION,
      id: row.id,
      ownerUserId: row.user_id,
      itemId: row.item_id,
      status: row.status,
      scope: row.scope_context,
      originalLanguage: row.original_language,
      authority: row.authority,
      revision: Number(row.revision),
      supersedesRecordId: row.supersedes_record_id,
      createdAt: row.created_at,
      restoredAt: row.restored_at,
    }));
  const revisions = {
    correctionRevision: Number(input.revision?.correction_revision ?? 0),
    suppressionRevision: Number(input.revision?.suppression_revision ?? 0),
  };

  return {
    ownerUserId,
    revisions,
    corrections,
    suppressions,
    activeCorrectionRefs: corrections.map((record) => ({
      correctionId: record.id,
      ownerUserId,
      scope: record.scope.kind,
      revision: String(record.revision),
      evidenceRef: evidenceRef({
        id: record.id,
        ownerUserId,
        authority: record.authority,
        sourceType: "correction",
        observedAt: record.createdAt,
      }),
    })),
    activeSuppressionRefs: suppressions.map((record) => ({
      suppressionId: record.id,
      ownerUserId,
      itemId: record.itemId,
      scope: record.scope.kind,
      revision: String(record.revision),
      active: true,
      evidenceRef: evidenceRef({
        id: record.id,
        ownerUserId,
        authority: record.authority,
        sourceType: "suppression",
        observedAt: record.createdAt,
      }),
    })),
    correctionStateRef: stateRef({
      schemaVersion: CORRECTION_STATE_VERSION,
      ownerUserId,
      requestId: input.requestId,
      revision: revisions.correctionRevision,
      generatedAt: input.generatedAt,
    }),
    suppressionStateRef: stateRef({
      schemaVersion: SUPPRESSION_STATE_VERSION,
      ownerUserId,
      requestId: input.requestId,
      revision: revisions.suppressionRevision,
      generatedAt: input.generatedAt,
    }),
  };
}

export class SupabaseCustomerMemoryStateRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly authenticatedUserId: string,
  ) {}

  async resolve(input: {
    context: RecommendationContextIdentity;
    requestId: string;
    generatedAt: string;
  }): Promise<ResolvedCustomerMemoryState> {
    if (input.context.ownerUserId !== this.authenticatedUserId) {
      throw new Error("Customer-memory state owner mismatch.");
    }
    const [revisionResult, correctionResult, suppressionResult] = await Promise.all([
      this.client.from("recommendation_customer_revisions_v2")
        .select("user_id, correction_revision, suppression_revision")
        .eq("user_id", this.authenticatedUserId)
        .maybeSingle(),
      this.client.from("recommendation_corrections_v2")
        .select("id, user_id, status, scope_context, original_language, directive, authority, revision, supersedes_record_id, created_at, restored_at")
        .eq("user_id", this.authenticatedUserId)
        .eq("status", "active"),
      this.client.from("recommendation_suppressions_v2")
        .select("id, user_id, item_id, status, scope_context, original_language, authority, revision, supersedes_record_id, created_at, restored_at")
        .eq("user_id", this.authenticatedUserId)
        .eq("status", "active"),
    ]);
    const error = revisionResult.error ?? correctionResult.error ?? suppressionResult.error;
    if (error) throw new Error(error.message);
    return resolveCustomerMemoryRows({
      ...input,
      revision: revisionResult.data as RevisionRow | null,
      correctionRows: (correctionResult.data ?? []) as CorrectionRow[],
      suppressionRows: (suppressionResult.data ?? []) as SuppressionRow[],
    });
  }
}
