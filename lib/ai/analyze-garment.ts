import "server-only";
import { getOpenAI, OPENAI_MODEL } from "@/lib/ai/openai";
import {
  CLOTHING_CATEGORIES,
  CLOTHING_SEASONS,
  CLOTHING_SUBCATEGORIES,
  WARDROBE_DEPARTMENTS,
  categoriesForDepartment,
  subcategoriesFor,
  type WardrobeDepartment,
} from "@/types/wardrobe";

export type GarmentSuggestion = {
  department: WardrobeDepartment | null;
  category: string | null;
  subcategory: string | null;
  itemName: string | null;
  designer: string | null;
  size: string | null;
  color: string | null;
  seasons: string[];
  altText: string;
  confidence: number;
  stylingSuggestion: string;
};

export async function analyzeGarmentImage(bytes: Buffer, mimeType: string): Promise<GarmentSuggestion> {
  const response = await getOpenAI().responses.create({
    model: OPENAI_MODEL,
    store: false,
    max_output_tokens: 700,
    instructions: "You are a careful luxury wardrobe archivist and stylist. Analyze only visible evidence. Leave uncertain values null. Never infer a brand or size without a visible label or marking. Classify the item into the provided Women or Men wardrobe hierarchy, keeping department, category, and subcategory consistent. Return concise editable metadata suggestions and one practical styling suggestion describing complementary pieces, colors, proportions, and suitable occasions. Season suggestions must be distinct.",
    input: [{ role: "user", content: [
      { type: "input_text", text: "Suggest department, category, subcategory, item name, visible brand, visible size, dominant color, up to three appropriate seasons, accessible alt text, and a concise styling suggestion for this wardrobe photo." },
      { type: "input_image", image_url: `data:${mimeType};base64,${bytes.toString("base64")}`, detail: "high" },
    ] }],
    text: { format: { type: "json_schema", name: "garment_analysis", strict: true, schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        department: { anyOf: [{ type: "string", enum: [...WARDROBE_DEPARTMENTS] }, { type: "null" }] },
        category: { anyOf: [{ type: "string", enum: [...CLOTHING_CATEGORIES] }, { type: "null" }] },
        subcategory: { anyOf: [{ type: "string", enum: [...CLOTHING_SUBCATEGORIES] }, { type: "null" }] },
        itemName: { anyOf: [{ type: "string" }, { type: "null" }] },
        designer: { anyOf: [{ type: "string" }, { type: "null" }] },
        size: { anyOf: [{ type: "string" }, { type: "null" }] },
        color: { anyOf: [{ type: "string" }, { type: "null" }] },
        seasons: { type: "array", items: { type: "string", enum: [...CLOTHING_SEASONS] }, maxItems: 3 },
        altText: { type: "string" },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        stylingSuggestion: { type: "string", maxLength: 1000 },
      },
      required: ["department", "category", "subcategory", "itemName", "designer", "size", "color", "seasons", "altText", "confidence", "stylingSuggestion"],
    } } },
  });
  const suggestion = JSON.parse(response.output_text) as GarmentSuggestion;
  const department = suggestion.department ?? "Women";
  const category = suggestion.category && categoriesForDepartment(department).includes(suggestion.category)
    ? suggestion.category
    : null;
  const subcategory = suggestion.subcategory && subcategoriesFor(department, category).includes(suggestion.subcategory)
    ? suggestion.subcategory
    : null;
  return {
    ...suggestion,
    department,
    category,
    subcategory,
    seasons: [...new Set(suggestion.seasons)].slice(0, 3),
  };
}
