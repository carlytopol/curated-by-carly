import sharp from "sharp";

export async function normalizeGarmentEditInput(bytes: Buffer) {
  return sharp(bytes, { failOn: "error", pages: 1 })
    .rotate()
    .flatten({ background: "#ffffff" })
    .toColorspace("srgb")
    .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
    .toBuffer();
}
