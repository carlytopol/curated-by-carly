import sharp from "sharp";

export async function finishGarmentCutout(input: Buffer) {
  const cutout = await sharp(input)
    .ensureAlpha()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize({
      width: 900,
      height: 900,
      fit: "inside",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer({ resolveWithObject: true });
  const left = Math.max(0, Math.floor((1024 - cutout.info.width) / 2));
  const top = Math.max(0, Math.floor((1024 - cutout.info.height) / 2));
  return sharp({
    create: { width: 1024, height: 1024, channels: 3, background: "#ffffff" },
  })
    .composite([{ input: cutout.data, left, top }])
    .jpeg({ quality: 90, chromaSubsampling: "4:4:4" })
    .toBuffer();
}
