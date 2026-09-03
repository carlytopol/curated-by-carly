export const OUTFIT_KNOWLEDGE_GRAPH_VERSION = "outfit-knowledge-graph.v1" as const;

export type OutfitRelationshipType =
  | "successful-combination"
  | "incompatible-combination"
  | "frequently-worn-combination"
  | "occasion-specific-combination"
  | "color-relationship"
  | "footwear-relationship";

export type OutfitKnowledgeEdge = {
  userId: string;
  sourceItemId: string;
  targetItemId: string;
  relationship: OutfitRelationshipType;
  context: Record<string, string>;
  weight: number;
  confidence: number;
  evidenceCount: number;
  provenance: string[];
  lastObservedAt: string;
  version: typeof OUTFIT_KNOWLEDGE_GRAPH_VERSION;
};

export type OutfitObservation = {
  id: string;
  itemIds: string[];
  occasion?: string | null;
  occurredAt: string;
  outcome: "worn" | "approved" | "rejected" | "corrected";
  reason?: string | null;
  colorsByItemId?: Record<string, string | null>;
  footwearItemIds?: string[];
};

const pairs = (itemIds: string[]) => {
  const unique = [...new Set(itemIds)].sort();
  return unique.flatMap((sourceItemId, index) =>
    unique.slice(index + 1).map((targetItemId) => ({ sourceItemId, targetItemId }))
  );
};

/**
 * Creates user-scoped relationship evidence only. No recommendation code reads
 * these edges yet; this is the learning foundation, not a behavior change.
 */
export function buildOutfitKnowledgeEdges(
  userId: string,
  observations: OutfitObservation[],
): OutfitKnowledgeEdge[] {
  const grouped = new Map<string, OutfitKnowledgeEdge>();
  const upsert = (
    observation: OutfitObservation,
    sourceItemId: string,
    targetItemId: string,
    relationship: OutfitRelationshipType,
    context: Record<string, string> = {},
  ) => {
    const contextKey = Object.entries(context).sort().map(([key, value]) => `${key}:${value}`).join("|");
    const key = [sourceItemId, targetItemId, relationship, contextKey].join("::");
    const existing = grouped.get(key);
    const positive = observation.outcome === "worn" || observation.outcome === "approved";
    if (existing) {
      existing.evidenceCount += 1;
      existing.weight += positive ? 1 : -1;
      existing.confidence = Math.min(1, 0.45 + existing.evidenceCount * 0.12);
      existing.provenance.push(observation.id);
      if (observation.occurredAt > existing.lastObservedAt) {
        existing.lastObservedAt = observation.occurredAt;
      }
      return;
    }
    grouped.set(key, {
      userId,
      sourceItemId,
      targetItemId,
      relationship,
      context,
      weight: positive ? 1 : -1,
      confidence: 0.57,
      evidenceCount: 1,
      provenance: [observation.id],
      lastObservedAt: observation.occurredAt,
      version: OUTFIT_KNOWLEDGE_GRAPH_VERSION,
    });
  };

  for (const observation of observations) {
    for (const { sourceItemId, targetItemId } of pairs(observation.itemIds)) {
      const relationship = observation.outcome === "rejected" || observation.outcome === "corrected"
        ? "incompatible-combination"
        : "successful-combination";
      upsert(observation, sourceItemId, targetItemId, relationship);
      if (observation.occasion) {
        upsert(observation, sourceItemId, targetItemId, "occasion-specific-combination", {
          occasion: observation.occasion.toLowerCase(),
        });
      }
      const sourceColor = observation.colorsByItemId?.[sourceItemId];
      const targetColor = observation.colorsByItemId?.[targetItemId];
      if (sourceColor && targetColor) {
        upsert(observation, sourceItemId, targetItemId, "color-relationship", {
          colors: [sourceColor, targetColor].map((color) => color.toLowerCase()).sort().join("+"),
        });
      }
      if (observation.footwearItemIds?.includes(sourceItemId) || observation.footwearItemIds?.includes(targetItemId)) {
        upsert(observation, sourceItemId, targetItemId, "footwear-relationship", {
          occasion: observation.occasion?.toLowerCase() ?? "unknown",
        });
      }
    }
  }

  for (const edge of grouped.values()) {
    if (edge.relationship === "successful-combination" && edge.evidenceCount >= 3) {
      const frequent = {
        ...edge,
        relationship: "frequently-worn-combination" as const,
        provenance: [...edge.provenance],
      };
      grouped.set([
        frequent.sourceItemId,
        frequent.targetItemId,
        frequent.relationship,
      ].join("::"), frequent);
    }
  }
  return [...grouped.values()];
}
