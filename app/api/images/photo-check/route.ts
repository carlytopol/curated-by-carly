import { requireCurrentUserId } from "@/lib/auth/require-current-user";
import { checkPhotoQuality } from "@/lib/ai/check-photo-quality";
import { readValidatedImage, UploadValidationError } from "@/lib/security/file-upload";
import { enforceRateLimit, RateLimitError, rateLimitResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    enforceRateLimit(userId, "photo-check", { limit: 30, windowMs: 10 * 60 * 1000 });
    const formData = await request.formData();
    const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File && entry.size > 0).slice(0, 5);
    if (!files.length) {
      return Response.json({ error: "Choose up to five JPEG, PNG, WebP, or HEIC images, 10 MB each." }, { status: 400 });
    }
    const images = await Promise.all(files.map((file) => readValidatedImage(file, { allowHeic: false })));
    const results = await checkPhotoQuality(images.map(({ bytes, mimeType }) => ({ bytes, mimeType })));
    return Response.json({ results });
  } catch (error) {
    if (error instanceof RateLimitError) return rateLimitResponse(error);
    if (error instanceof UploadValidationError) return Response.json({ error: error.message }, { status: 400 });
    console.error("Photo quality check unavailable.", error);
    return Response.json({ error: "AI Photo Check is unavailable right now. You can continue and review the photo yourself." }, { status: 503 });
  }
}
