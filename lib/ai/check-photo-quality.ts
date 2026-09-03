import "server-only";
import { getOpenAI, OPENAI_MODEL } from "@/lib/ai/openai";

export type PhotoQualityResult = {
  index: number;
  ready: boolean;
  score: number;
  issues: string[];
  guidance: string;
};

type PhotoInput = { bytes: Buffer; mimeType: string };

export async function checkPhotoQuality(images: PhotoInput[]): Promise<PhotoQualityResult[]> {
  const content: Array<
    | { type: "input_text"; text: string }
    | { type: "input_image"; image_url: string; detail: "high" }
  > = [{
    type: "input_text",
    text: `Review the following ${images.length} wardrobe or outfit photo${images.length === 1 ? "" : "s"} in order. Check sharpness, lighting, true color, unobstructed framing, full-item visibility, background distraction, angle, and whether one clear subject is present. Mark ready=false only when a retake would materially improve wardrobe identification or presentation. Give concise, kind, practical guidance. Use zero-based indexes: Image 1 has index 0, Image 2 has index 1, and so on.`,
  }];
  images.forEach((image, index) => {
    content.push({ type: "input_text", text: `Image ${index + 1}` });
    content.push({ type: "input_image", image_url: `data:${image.mimeType};base64,${image.bytes.toString("base64")}`, detail: "high" });
  });

  const response = await getOpenAI().responses.create({
    model: OPENAI_MODEL,
    store: false,
    max_output_tokens: 900,
    instructions: "You are Curated's private photo editor. Evaluate only technical clarity and presentation. Do not judge the garment, outfit, person, body, taste, attractiveness, or value. A usable photo may be ready even if it is not studio-perfect.",
    input: [{ role: "user", content }],
    text: { format: { type: "json_schema", name: "photo_quality_check", strict: true, schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              index: { type: "integer", minimum: 0 },
              ready: { type: "boolean" },
              score: { type: "number", minimum: 0, maximum: 1 },
              issues: { type: "array", items: { type: "string" }, maxItems: 4 },
              guidance: { type: "string" },
            },
            required: ["index", "ready", "score", "issues", "guidance"],
          },
        },
      },
      required: ["results"],
    } } },
  });
  const parsed = JSON.parse(response.output_text) as { results: PhotoQualityResult[] };
  return images.map((_, index) => parsed.results.find((result) => result.index === index) ?? {
    index,
    ready: true,
    score: 0.5,
    issues: [],
    guidance: "Photo received.",
  });
}
