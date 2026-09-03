import { emptyMaleMeasurements, type UserProfile } from "@/types/profile";

function optionalText(value: unknown, max = 500) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const clean = value.trim();
  return clean.length <= max ? clean || null : undefined;
}

function optionalNumber(value: unknown, min: number, max: number) {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : undefined;
}

export function validateUserProfile(value: unknown):
  | { success: true; data: UserProfile }
  | { success: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { success: false, error: "Invalid profile." };
  }
  const input = value as Record<string, unknown>;
  const unit = input.measurementUnit === "metric" ? "metric" : "imperial";
  const suppliedMaleMeasurements = input.maleMeasurements && typeof input.maleMeasurements === "object" && !Array.isArray(input.maleMeasurements)
    ? input.maleMeasurements as Record<string, unknown> : {};
  const maleMeasurements = Object.fromEntries(Object.keys(emptyMaleMeasurements).map((field) => [
    field,
    optionalNumber(suppliedMaleMeasurements[field], 5, 350),
  ])) as UserProfile["maleMeasurements"];
  const data: UserProfile = {
    displayName: optionalText(input.displayName, 100) as string | null,
    sex: input.sex === "male" ? "male" : "female",
    timezone: optionalText(input.timezone, 100) as string | null,
    locationName: optionalText(input.locationName, 150) as string | null,
    latitude: optionalNumber(input.latitude, -90, 90) as number | null,
    longitude: optionalNumber(input.longitude, -180, 180) as number | null,
    measurementUnit: unit,
    heightCm: optionalNumber(input.heightCm, 50, 275) as number | null,
    weightKg: optionalNumber(input.weightKg, 20, 500) as number | null,
    bustCm: optionalNumber(input.bustCm, 20, 250) as number | null,
    underbustCm: optionalNumber(input.underbustCm, 20, 250) as number | null,
    waistCm: optionalNumber(input.waistCm, 20, 250) as number | null,
    hipsCm: optionalNumber(input.hipsCm, 20, 300) as number | null,
    thighCm: optionalNumber(input.thighCm, 10, 150) as number | null,
    bodiceLengthFrontCm: optionalNumber(input.bodiceLengthFrontCm, 10, 150) as number | null,
    sleeveLengthCm: optionalNumber(input.sleeveLengthCm, 10, 150) as number | null,
    pantLengthCm: optionalNumber(input.pantLengthCm, 20, 200) as number | null,
    inseamCm: optionalNumber(input.inseamCm, 10, 150) as number | null,
    shoulderWidthCm: optionalNumber(input.shoulderWidthCm, 10, 100) as number | null,
    topSize: optionalText(input.topSize, 50) as string | null,
    bottomSize: optionalText(input.bottomSize, 50) as string | null,
    dressSize: optionalText(input.dressSize, 50) as string | null,
    shoeSize: optionalText(input.shoeSize, 50) as string | null,
    shoeSizeSystem: input.shoeSizeSystem === "EU" ? "EU" : "US",
    maleMeasurements,
    proportions: optionalText(input.proportions, 500) as string | null,
    fitNotes: optionalText(input.fitNotes, 1000) as string | null,
    styleNotes: optionalText(input.styleNotes, 1000) as string | null,
  };
  if (Object.values(data).some((field) => field === undefined)
    || Object.values(data.maleMeasurements).some((field) => field === undefined)) {
    return { success: false, error: "Check the profile values and try again." };
  }
  return { success: true, data };
}
