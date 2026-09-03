import "server-only";
import { getOpenAI, OPENAI_MODEL } from "@/lib/ai/openai";
import {
  type CanonicalWardrobeMetadata,
  type EnrichmentField,
  type MetadataInference,
  planMetadataEnrichment,
} from "@/lib/wardrobe/metadata-enrichment";

const FIELDS: EnrichmentField[] = [
  "department", "category", "subcategory", "item_name", "designer", "size",
  "color", "season", "material", "formality", "occasion", "has_pockets",
  "shoe_type", "sleeve_length", "fabric_weight", "silhouette", "fit_behavior",
  "warmth", "breathability", "rain_tolerance", "walkability",
  "standing_tolerance", "pocket_function", "mobility", "pattern",
  "branding_intensity",
];

type EnrichmentRequest = {
  item: CanonicalWardrobeMetadata;
  image?: { bytes: Buffer; mimeType: string };
};

/**
 * AI enrichment is deliberately separate from recommendation generation.
 * Its output is an inference overlay and never updates confirmed item fields.
 */
export async function inferWardrobeMetadata(input: EnrichmentRequest) {
  const missingFields = FIELDS.filter((field) => {
    const value = input.item[field];
    return value === null || value === undefined || value === "";
  });
  if (!missingFields.length) return planMetadataEnrichment(input.item, []);

  const content: Array<
    | { type: "input_text"; text: string }
    | { type: "input_image"; image_url: string; detail: "high" }
  > = [{
    type: "input_text",
    text: `Infer only these missing fields: ${missingFields.join(", ")}. Existing confirmed metadata: ${JSON.stringify(input.item)}.`,
  }];
  if (input.image) {
    content.push({
      type: "input_image",
      image_url: `data:${input.image.mimeType};base64,${input.image.bytes.toString("base64")}`,
      detail: "high",
    });
  }
  const createResponse = (maxOutputTokens: number) => getOpenAI().responses.create({
      model: OPENAI_MODEL,
      store: false,
      max_output_tokens: maxOutputTokens,
      reasoning: { effort: "low" },
      instructions: [
        "You are Curated’s discreet wardrobe archivist.",
        "Infer only from visible or supplied evidence; do not guess a brand or size.",
        "Return one entry per supported missing field when evidence exists.",
        "Use a calibrated 0–1 confidence and state the concise evidence.",
        "Use normalized 1–5 numeric strings for formality, warmth, walkability, and standing tolerance.",
        "Treat pocket presence as known only when it is visible or supplied; do not infer it from garment class.",
        "Ownership, brand, and price are never evidence of preference, formality, comfort, or quality.",
        "Never propose a replacement for a supplied value.",
      ].join(" "),
      input: [{ role: "user", content }],
      text: {
        format: {
          type: "json_schema",
          name: "wardrobe_metadata_enrichment",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              inferences: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    field: { type: "string", enum: FIELDS },
                    value: {
                      anyOf: [
                        { type: "string" },
                        { type: "boolean" },
                        { type: "null" },
                      ],
                    },
                    confidence: { type: "number", minimum: 0, maximum: 1 },
                    evidence: { type: "string", maxLength: 300 },
                  },
                  required: ["field", "value", "confidence", "evidence"],
                },
              },
            },
            required: ["inferences"],
          },
        },
      },
    });

  let parsed: { inferences: Array<Omit<MetadataInference, "provenance">> } | null = null;
  let parseError: unknown;
  for (const maxOutputTokens of [5_000, 8_000]) {
    const response = await createResponse(maxOutputTokens);
    try {
      if (!response.output_text.trim()) throw new Error("The archivist returned an empty structured response.");
      parsed = JSON.parse(response.output_text) as {
        inferences: Array<Omit<MetadataInference, "provenance">>;
      };
      break;
    } catch (error) {
      parseError = error;
    }
  }
  if (!parsed) throw parseError ?? new Error("The archivist response could not be read.");
  return planMetadataEnrichment(
    input.item,
    parsed.inferences.map((inference) => ({
      ...inference,
      provenance: "ai-inference",
    })),
  );
}
