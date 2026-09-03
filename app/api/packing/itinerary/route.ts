import { requireCurrentUserId } from "@/lib/auth/require-current-user";
import { getOpenAI, OPENAI_MODEL } from "@/lib/ai/openai";
import { UploadValidationError, validateItineraryFile } from "@/lib/security/file-upload";
import { enforceRateLimit, RateLimitError, rateLimitResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    enforceRateLimit(userId, "itinerary-analysis", { limit: 8, windowMs: 10 * 60 * 1000 });
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Choose a PDF, Word, text, Markdown, CSV, JSON, or RTF itinerary up to 8 MB." }, { status: 400 });
    }
    const validated = await validateItineraryFile(file);
    const fileData = `data:${file.type || "application/octet-stream"};base64,${validated.bytes.toString("base64")}`;
    const response = await getOpenAI().responses.create({
      model: OPENAI_MODEL,
      store: false,
      max_output_tokens: 1400,
      instructions: "Extract only itinerary information that is present in the supplied private travel document. Preserve dates, times, cities, hotels, reservations, activities, dress-relevant occasions, and free periods. Do not invent missing plans. Return a concise plain-text itinerary suitable for a private stylist.",
      input: [{ role: "user", content: [
        { type: "input_text", text: "Read this itinerary file and convert it into a clear chronological itinerary for packing guidance." },
        { type: "input_file", file_data: fileData, filename: file.name, detail: "high" },
      ] }],
      text: { format: { type: "json_schema", name: "itinerary_extract", strict: true, schema: {
        type: "object",
        additionalProperties: false,
        properties: { itinerary: { type: "string" } },
        required: ["itinerary"],
      } } },
    });
    return Response.json(JSON.parse(response.output_text));
  } catch (error) {
    if (error instanceof RateLimitError) return rateLimitResponse(error);
    if (error instanceof UploadValidationError) return Response.json({ error: error.message }, { status: 400 });
    console.error("Itinerary file review unavailable.", error);
    return Response.json({ error: "We could not read that itinerary. Try a PDF or paste the details below." }, { status: 503 });
  }
}
