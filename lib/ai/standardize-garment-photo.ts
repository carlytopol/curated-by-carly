import "server-only";
import { getOpenAI } from "@/lib/ai/openai";
import { finishGarmentCutout } from "@/lib/media/finish-garment-cutout";
import { normalizeGarmentEditInput } from "@/lib/media/normalize-garment-edit-input";

export async function standardizeGarmentPhoto(bytes: Buffer) {
  const normalizedInput = await normalizeGarmentEditInput(bytes);
  const image = new File([new Uint8Array(normalizedInput)], "wardrobe-input.jpg", {
    type: "image/jpeg",
  });
  const response = await getOpenAI().images.edit(
    {
      model: "gpt-image-1.5",
      image,
      prompt:
        "Create an exact transparent-background cutout of the single wardrobe item. Remove the room, wall, floor, hanger, hooks, people, hands, shadows, and every non-item object. Preserve the complete garment or accessory exactly: do not redesign, repair, recolor, reshape, crop, add, remove, smooth, or invent any fabric, pattern, texture, stitching, label, hardware, embellishment, wear, or proportion. The output must contain only the full item and transparent pixels around it, with no backdrop and no cast shadow.",
      background: "transparent",
      input_fidelity: "high",
      output_format: "png",
      quality: "medium",
      size: "1024x1024",
      n: 1,
    },
    { timeout: 120_000, maxRetries: 1 },
  );
  const encoded = response.data?.[0]?.b64_json;
  if (!encoded) throw new Error("standardized_image_missing");
  const finished = await finishGarmentCutout(Buffer.from(encoded, "base64"));
  return { bytes: finished, mimeType: "image/jpeg", extension: "jpg" as const };
}
