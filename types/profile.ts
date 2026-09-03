export type UserProfile = {
  displayName: string | null;
  sex: "female" | "male";
  timezone: string | null;
  locationName: string | null;
  latitude: number | null;
  longitude: number | null;
  measurementUnit: "imperial" | "metric";
  heightCm: number | null;
  weightKg: number | null;
  bustCm: number | null;
  underbustCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  thighCm: number | null;
  bodiceLengthFrontCm: number | null;
  sleeveLengthCm: number | null;
  pantLengthCm: number | null;
  inseamCm: number | null;
  shoulderWidthCm: number | null;
  topSize: string | null;
  bottomSize: string | null;
  dressSize: string | null;
  shoeSize: string | null;
  shoeSizeSystem: "US" | "EU";
  maleMeasurements: MaleMeasurements;
  proportions: string | null;
  fitNotes: string | null;
  styleNotes: string | null;
};

export type MaleMeasurementField =
  | "neckCm" | "chestCm" | "overarmCm" | "backWidthCm" | "jacketLengthCm"
  | "frontLengthCm" | "backLengthCm" | "armholeDepthCm" | "bicepCm" | "wristCm"
  | "trouserWaistCm" | "seatCm" | "riseCm" | "frontRiseCm" | "backRiseCm"
  | "kneeCm" | "calfCm" | "trouserOutseamCm" | "bottomOpeningCm";

export type MaleMeasurements = Record<MaleMeasurementField, number | null>;

export const emptyMaleMeasurements: MaleMeasurements = {
  neckCm: null, chestCm: null, overarmCm: null, backWidthCm: null, jacketLengthCm: null,
  frontLengthCm: null, backLengthCm: null, armholeDepthCm: null, bicepCm: null, wristCm: null,
  trouserWaistCm: null, seatCm: null, riseCm: null, frontRiseCm: null, backRiseCm: null,
  kneeCm: null, calfCm: null, trouserOutseamCm: null, bottomOpeningCm: null,
};
