"use client";

const AI_READY_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const TARGET_BYTES = 700 * 1024;
const MAX_EDGE = 2048;

function loadImage(file: File) {
  return new Promise<{ image: HTMLImageElement; release: () => void }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, release: () => URL.revokeObjectURL(url) });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This photo could not be prepared."));
    };
    image.src = url;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("This photo could not be prepared.")), "image/jpeg", quality);
  });
}

function jpegName(name: string) {
  const stem = name.replace(/\.[^.]+$/, "") || "wardrobe-photo";
  return `${stem}.jpg`;
}

export async function prepareWardrobeImage(file: File) {
  const needsConversion = !AI_READY_TYPES.has(file.type) || file.size > TARGET_BYTES;
  if (!needsConversion) return file;

  let release: (() => void) | undefined;
  try {
    const loaded = await loadImage(file);
    release = loaded.release;
    const { image } = loaded;
    const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);
    let scale = Math.min(1, MAX_EDGE / longestEdge);
    let quality = 0.84;
    let jpeg: Blob | null = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("This photo could not be prepared.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      jpeg = await canvasToJpeg(canvas, quality);
      if (jpeg.size <= TARGET_BYTES) break;
      scale *= 0.82;
      quality = Math.max(0.58, quality - 0.08);
    }

    if (!jpeg) return file;
    return new File([jpeg], jpegName(file.name), {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    // Saving the original remains available even when a browser cannot convert it.
    return file;
  } finally {
    release?.();
  }
}

export async function prepareWardrobeImages(files: File[]) {
  const prepared: File[] = [];
  for (const file of files) prepared.push(await prepareWardrobeImage(file));
  return prepared;
}
