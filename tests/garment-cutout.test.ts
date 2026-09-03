import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { finishGarmentCutout } from "../lib/media/finish-garment-cutout";
import { normalizeGarmentEditInput } from "../lib/media/normalize-garment-edit-input";

test("normalizes legacy image modes into an AI-compatible RGB JPEG", async () => {
  const legacyInput = await sharp({
    create: { width: 2400, height: 1200, channels: 4, background: { r: 40, g: 60, b: 80, alpha: 0.6 } },
  }).png().toBuffer();
  const normalized = await normalizeGarmentEditInput(legacyInput);
  const metadata = await sharp(normalized).metadata();
  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.space, "srgb");
  assert.equal(metadata.channels, 3);
  assert.equal(metadata.width, 2048);
  assert.equal(metadata.height, 1024);
});

test("trims a transparent garment cutout and centers it on pure white", async () => {
  const subject = await sharp({
    create: {
      width: 200,
      height: 300,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: 60,
            height: 180,
            channels: 4,
            background: { r: 90, g: 20, b: 40, alpha: 1 },
          },
        })
          .png()
          .toBuffer(),
        left: 70,
        top: 60,
      },
    ])
    .png()
    .toBuffer();
  const output = await finishGarmentCutout(subject);
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.width, 1024);
  assert.equal(metadata.height, 1024);
  const corner = await sharp(output)
    .extract({ left: 0, top: 0, width: 1, height: 1 })
    .raw()
    .toBuffer();
  assert.ok(corner[0] >= 250 && corner[1] >= 250 && corner[2] >= 250);
});
