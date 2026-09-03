import "server-only";

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export class UploadValidationError extends Error {}

function startsWith(bytes: Buffer, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function detectedImageType(bytes: Buffer) {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (bytes.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = bytes.subarray(8, 12).toString("ascii").toLowerCase();
    if (["heic", "heix", "hevc", "hevx"].includes(brand)) return "image/heic";
    if (["heif", "mif1", "msf1"].includes(brand)) return "image/heif";
  }
  return null;
}

export function extensionForImageMime(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/heic") return "heic";
  if (mimeType === "image/heif") return "heif";
  return "jpg";
}

export async function readValidatedImage(
  file: File,
  options: { maxBytes?: number; allowHeic?: boolean } = {},
) {
  const maxBytes = options.maxBytes ?? 10 * 1024 * 1024;
  if (!file.size || file.size > maxBytes || !IMAGE_MIME_TYPES.has(file.type)) {
    throw new UploadValidationError("Choose a JPEG, PNG, WebP, or HEIC image up to 10 MB.");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const detectedType = detectedImageType(bytes);
  if (!detectedType || detectedType !== file.type) {
    throw new UploadValidationError("This file does not appear to be a valid supported image.");
  }
  if (!options.allowHeic && (detectedType === "image/heic" || detectedType === "image/heif")) {
    throw new UploadValidationError("This AI review needs a JPEG, PNG, or WebP image. Choose the photo again so Curated can prepare it.");
  }
  return { bytes, mimeType: detectedType, extension: extensionForImageMime(detectedType) };
}

export async function validateItineraryFile(file: File, maxBytes = 8 * 1024 * 1024) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const allowedExtensions = new Set(["pdf", "doc", "docx", "txt", "md", "csv", "json", "rtf"]);
  if (!file.size || file.size > maxBytes || !allowedExtensions.has(extension)) {
    throw new UploadValidationError("Choose a PDF, Word, text, Markdown, CSV, JSON, or RTF itinerary up to 8 MB.");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const isPdf = startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  const isZip = startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]);
  const isOle = startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  const looksTextual = !bytes.subarray(0, Math.min(bytes.length, 4096)).includes(0);
  const valid = extension === "pdf" ? isPdf
    : extension === "docx" ? isZip
      : extension === "doc" ? isOle
        : looksTextual;
  if (!valid) throw new UploadValidationError("The itinerary contents do not match the selected file type.");
  return { bytes, extension };
}
