import {
  WARDROBE_DEPARTMENTS,
  categoriesForDepartment,
  normalizeWardrobeCategory,
  subcategoriesFor,
  type WardrobeDepartment,
} from "@/types/wardrobe";
import {
  classifyWardrobeRole,
  classifyWardrobeTraits,
} from "@/lib/recommendations/engine/item-taxonomy";
import type { GarmentEvidence, GarmentEvidenceField } from "@/lib/recommendations/evidence/contracts";

export type WardrobeAuditItem = {
  id: string;
  designer?: string | null;
  item_name?: string | null;
  department?: string | null;
  category?: string | null;
  subcategory?: string | null;
  subcategory_2?: string | null;
  size?: string | null;
  color?: string | null;
  season?: string | null;
  season_2?: string | null;
  season_3?: string | null;
  styling_suggestion?: string | null;
  analysis_status?: string | null;
  analysis_metadata?: unknown;
  garmentEvidence?: GarmentEvidence;
};

export type MetadataIssue = {
  itemId: string;
  field: string;
  severity: "required" | "helpful" | "conflict" | "low-confidence";
  message: string;
};

export type DuplicateGroup = {
  key: string;
  itemIds: string[];
  reason: string;
};

export type WardrobeMetadataAudit = {
  auditedAt: string;
  itemCount: number;
  qualityScore: number;
  missingMetadata: MetadataIssue[];
  conflictingMetadata: MetadataIssue[];
  duplicateItems: DuplicateGroup[];
  lowConfidenceClassifications: MetadataIssue[];
  itemsNeedingManualReview: string[];
  fieldCompleteness: Record<string, { present: number; total: number; percent: number }>;
  decisionCriticalCompleteness: {
    known: number;
    total: number;
    percent: number;
    reliable: number;
    reliablePercent: number;
    unknownByField: Partial<Record<GarmentEvidenceField, number>>;
  };
};

const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

function classificationConfidence(item: WardrobeAuditItem) {
  const metadata = record(item.analysis_metadata);
  const candidates = [
    metadata?.classificationConfidence,
    metadata?.classification_confidence,
    metadata?.confidence,
  ];
  return candidates.find((value): value is number =>
    typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1
  ) ?? null;
}

function duplicateKey(item: WardrobeAuditItem) {
  const values = [
    item.designer,
    item.item_name,
    item.department,
    item.category,
    item.subcategory,
    item.color,
    item.size,
  ].map((value) => text(value)?.toLowerCase() ?? "");
  return values.filter(Boolean).length >= 3 ? values.join("|") : null;
}

function fingerprint(item: WardrobeAuditItem) {
  const metadata = record(item.analysis_metadata);
  const value = metadata?.imageHash ?? metadata?.image_hash ?? metadata?.perceptualHash;
  return text(value)?.toLowerCase() ?? null;
}

function taxonomyConflict(item: WardrobeAuditItem): MetadataIssue[] {
  const issues: MetadataIssue[] = [];
  const department = text(item.department);
  if (!department || !WARDROBE_DEPARTMENTS.includes(department as WardrobeDepartment)) {
    issues.push({
      itemId: item.id,
      field: "department",
      severity: "conflict",
      message: department
        ? `“${department}” is not in the wardrobe hierarchy.`
        : "Department is missing.",
    });
    return issues;
  }
  const normalizedCategory = normalizeWardrobeCategory(
    department as WardrobeDepartment,
    item.category,
  );
  if (normalizedCategory && !categoriesForDepartment(department as WardrobeDepartment).includes(normalizedCategory)) {
    issues.push({
      itemId: item.id,
      field: "category",
      severity: "conflict",
      message: `“${item.category}” does not belong to ${department}.`,
    });
  }
  const allowedSubcategories = subcategoriesFor(
    department as WardrobeDepartment,
    normalizedCategory,
  );
  for (const [field, value] of [
    ["subcategory", item.subcategory],
    ["subcategory_2", item.subcategory_2],
  ] as const) {
    if (text(value) && !allowedSubcategories.includes(value!)) {
      issues.push({
        itemId: item.id,
        field,
        severity: "conflict",
        message: `“${value}” does not belong to ${normalizedCategory ?? "this category"}.`,
      });
    }
  }
  if (text(item.subcategory) && item.subcategory === item.subcategory_2) {
    issues.push({
      itemId: item.id,
      field: "subcategory_2",
      severity: "conflict",
      message: "The secondary subcategory duplicates the primary subcategory.",
    });
  }
  const role = classifyWardrobeRole({
    id: item.id,
    category: item.category ?? null,
    subcategory: item.subcategory,
    subcategory_2: item.subcategory_2,
    item_name: item.item_name,
  });
  const traits = classifyWardrobeTraits({
    id: item.id,
    category: item.category ?? null,
    subcategory: item.subcategory,
    subcategory_2: item.subcategory_2,
    item_name: item.item_name,
    color: item.color,
    analysis_metadata: item.analysis_metadata,
  });
  if (role === "other" && text(item.category)) {
    issues.push({
      itemId: item.id,
      field: "category",
      severity: "conflict",
      message: "The category and item name do not resolve to a usable garment role.",
    });
  }
  if (traits.role === "shoes" && traits.pockets === true) {
    issues.push({
      itemId: item.id,
      field: "analysis_metadata.has_pockets",
      severity: "conflict",
      message: "Footwear cannot be treated as carrying verified garment pockets.",
    });
  }
  return issues;
}

export function auditWardrobeMetadata(
  items: WardrobeAuditItem[],
  auditedAt = new Date().toISOString(),
): WardrobeMetadataAudit {
  const missingMetadata: MetadataIssue[] = [];
  const conflictingMetadata = items.flatMap(taxonomyConflict);
  const lowConfidenceClassifications: MetadataIssue[] = [];
  const trackedFields = [
    "item_name", "department", "category", "subcategory", "color",
    "season", "designer", "size", "styling_suggestion",
  ] as const;
  const fieldCompleteness = Object.fromEntries(trackedFields.map((field) => {
    const present = items.filter((item) => text(item[field])).length;
    return [field, {
      present,
      total: items.length,
      percent: items.length ? Math.round((present / items.length) * 100) : 100,
    }];
  }));
  const decisionFields: GarmentEvidenceField[] = [
    "role", "formality", "material", "warmth", "breathability",
    "rain_tolerance", "walkability", "standing_tolerance", "has_pockets",
    "pocket_function", "mobility",
  ];
  let known = 0;
  let reliable = 0;
  const unknownByField: Partial<Record<GarmentEvidenceField, number>> = {};
  for (const item of items) {
    for (const field of decisionFields) {
      const value = item.garmentEvidence?.fields[field];
      if (value?.state === "known") {
        known += 1;
        if (value.confidence === "high" || value.provenance === "user-confirmed") reliable += 1;
      } else {
        unknownByField[field] = (unknownByField[field] ?? 0) + 1;
      }
    }
  }
  const decisionTotal = items.length * decisionFields.length;

  for (const item of items) {
    for (const field of ["item_name", "department", "category"] as const) {
      if (!text(item[field])) {
        missingMetadata.push({
          itemId: item.id,
          field,
          severity: "required",
          message: `${field.replaceAll("_", " ")} is needed for reliable wardrobe interpretation.`,
        });
      }
    }
    for (const field of ["subcategory", "color", "season", "designer", "size", "styling_suggestion"] as const) {
      if (!text(item[field])) {
        missingMetadata.push({
          itemId: item.id,
          field,
          severity: "helpful",
          message: `${field.replaceAll("_", " ")} is blank; it remains optional but would improve interpretation.`,
        });
      }
    }
    const confidence = classificationConfidence(item);
    if (confidence !== null && confidence < 0.7) {
      lowConfidenceClassifications.push({
        itemId: item.id,
        field: "classification",
        severity: "low-confidence",
        message: `Classification confidence is ${Math.round(confidence * 100)}%.`,
      });
    } else if (item.analysis_status === "failed" || item.analysis_status === "needs_review") {
      lowConfidenceClassifications.push({
        itemId: item.id,
        field: "classification",
        severity: "low-confidence",
        message: `Analysis status is ${item.analysis_status.replaceAll("_", " ")}.`,
      });
    }
  }

  const duplicateBuckets = new Map<string, { ids: string[]; reason: string }>();
  for (const item of items) {
    const imageFingerprint = fingerprint(item);
    const key = imageFingerprint ? `image:${imageFingerprint}` : duplicateKey(item);
    if (!key) continue;
    const current = duplicateBuckets.get(key) ?? {
      ids: [],
      reason: imageFingerprint
        ? "Items share the same image fingerprint."
        : "Items share the same normalized wardrobe metadata.",
    };
    current.ids.push(item.id);
    duplicateBuckets.set(key, current);
  }
  const duplicateItems = [...duplicateBuckets.entries()]
    .filter(([, value]) => value.ids.length > 1)
    .map(([key, value]) => ({ key, itemIds: value.ids, reason: value.reason }));
  const manual = new Set<string>([
    ...conflictingMetadata.map((issue) => issue.itemId),
    ...lowConfidenceClassifications.map((issue) => issue.itemId),
    ...duplicateItems.flatMap((group) => group.itemIds),
  ]);
  const requiredMissing = missingMetadata.filter((issue) => issue.severity === "required").length;
  const penalty = requiredMissing * 8
    + conflictingMetadata.length * 10
    + lowConfidenceClassifications.length * 5
    + duplicateItems.length * 4;
  const denominator = Math.max(items.length * 10, 1);

  return {
    auditedAt,
    itemCount: items.length,
    qualityScore: Math.max(0, Math.round(100 - (penalty / denominator) * 100)),
    missingMetadata,
    conflictingMetadata,
    duplicateItems,
    lowConfidenceClassifications,
    itemsNeedingManualReview: [...manual],
    fieldCompleteness,
    decisionCriticalCompleteness: {
      known,
      total: decisionTotal,
      percent: decisionTotal ? Math.round((known / decisionTotal) * 100) : 100,
      reliable,
      reliablePercent: decisionTotal ? Math.round((reliable / decisionTotal) * 100) : 100,
      unknownByField,
    },
  };
}
