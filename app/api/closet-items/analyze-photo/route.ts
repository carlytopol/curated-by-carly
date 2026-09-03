import { requireCurrentUserId } from "@/lib/auth/require-current-user";
import { analyzeGarmentImage } from "@/lib/ai/analyze-garment";
import { readValidatedImage, UploadValidationError } from "@/lib/security/file-upload";
import { enforceRateLimit, RateLimitError, rateLimitResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    enforceRateLimit(userId, "garment-analysis", { limit: 30, windowMs: 10 * 60 * 1000 });
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Choose a JPEG, PNG, WebP, or HEIC image up to 10 MB." }, { status: 400 });
    }
    const image = await readValidatedImage(file, { allowHeic: false });
    const suggestion = await analyzeGarmentImage(image.bytes, image.mimeType);
    return Response.json(suggestion);
  } catch (error) {
    if (error instanceof RateLimitError) return rateLimitResponse(error);
    if (error instanceof UploadValidationError) return Response.json({ error: error.message }, { status: 400 });
    console.error("Pre-save garment analysis unavailable.", error);
    const notConfigured = !process.env.OPENAI_API_KEY;
    return Response.json({ error: notConfigured ? "Automatic details need an OpenAI API key. You can still enter or save details manually." : "Automatic details are unavailable right now. You can still enter them manually." }, { status: 503 });
  }
}
