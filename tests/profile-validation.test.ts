import assert from "node:assert/strict";
import test from "node:test";
import { validateUserProfile } from "../lib/validation/profile";

test("accepts an entirely optional profile", () => {
  const result = validateUserProfile({ measurementUnit: "imperial" });
  assert.equal(result.success, true);
});

test("accepts private measurements within sensible bounds", () => {
  const result = validateUserProfile({
    measurementUnit: "metric",
    heightCm: 168,
    weightKg: 62,
    bustCm: 91,
    underbustCm: 78,
    waistCm: 72,
    hipsCm: 98,
    inseamCm: 79,
    shoulderWidthCm: 40,
    proportions: "Long torso; prefers a defined waist.",
  });
  assert.equal(result.success, true);
});

test("accepts a male tailoring profile and European shoe sizing", () => {
  const result = validateUserProfile({
    sex: "male",
    shoeSizeSystem: "EU",
    shoeSize: "43",
    maleMeasurements: {
      neckCm: 40,
      chestCm: 102,
      overarmCm: 124,
      trouserWaistCm: 86,
      riseCm: 74,
      bottomOpeningCm: 38,
    },
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.sex, "male");
    assert.equal(result.data.shoeSizeSystem, "EU");
    assert.equal(result.data.maleMeasurements.chestCm, 102);
  }
});

test("rejects malformed or implausible measurements", () => {
  assert.equal(validateUserProfile({ heightCm: 10 }).success, false);
  assert.equal(validateUserProfile({ latitude: 200 }).success, false);
  assert.equal(validateUserProfile({ shoulderWidthCm: 5 }).success, false);
  assert.equal(validateUserProfile({ sex: "male", maleMeasurements: { neckCm: 500 } }).success, false);
});
