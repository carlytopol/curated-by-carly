import "server-only";
import { createClient } from "@/lib/supabase/server";
import { emptyMaleMeasurements, type UserProfile } from "@/types/profile";

type UserProfileRow = {
  display_name: string | null;
  sex: string | null;
  timezone: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  measurement_unit: string;
  height_cm: number | null;
  weight_kg: number | null;
  bust_cm: number | null;
  underbust_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  thigh_cm: number | null;
  bodice_length_front_cm: number | null;
  sleeve_length_cm: number | null;
  pant_length_cm: number | null;
  inseam_cm: number | null;
  shoulder_width_cm: number | null;
  top_size: string | null;
  bottom_size: string | null;
  dress_size: string | null;
  shoe_size: string | null;
  shoe_size_system: string | null;
  male_measurements: Record<string, unknown> | null;
  proportions: string | null;
  fit_notes: string | null;
  style_notes: string | null;
};

const emptyProfile: UserProfile = {
  displayName: null,
  sex: "female",
  timezone: null,
  locationName: null,
  latitude: null,
  longitude: null,
  measurementUnit: "imperial",
  heightCm: null,
  weightKg: null,
  bustCm: null,
  underbustCm: null,
  waistCm: null,
  hipsCm: null,
  thighCm: null,
  bodiceLengthFrontCm: null,
  sleeveLengthCm: null,
  pantLengthCm: null,
  inseamCm: null,
  shoulderWidthCm: null,
  topSize: null,
  bottomSize: null,
  dressSize: null,
  shoeSize: null,
  shoeSizeSystem: "US",
  maleMeasurements: emptyMaleMeasurements,
  proportions: null,
  fitNotes: null,
  styleNotes: null,
};

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("display_name,sex,timezone,location_name,latitude,longitude,measurement_unit,height_cm,weight_kg,bust_cm,underbust_cm,waist_cm,hips_cm,thigh_cm,bodice_length_front_cm,sleeve_length_cm,pant_length_cm,inseam_cm,shoulder_width_cm,top_size,bottom_size,dress_size,shoe_size,shoe_size_system,male_measurements,proportions,fit_notes,style_notes")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Profile query failed: ${error.message}`);
  if (!data) return emptyProfile;
  const profile = data as UserProfileRow;
  return {
    displayName: profile.display_name,
    sex: profile.sex === "male" ? "male" : "female",
    timezone: profile.timezone,
    locationName: profile.location_name,
    latitude: profile.latitude,
    longitude: profile.longitude,
    measurementUnit: profile.measurement_unit === "metric" ? "metric" : "imperial",
    heightCm: profile.height_cm,
    weightKg: profile.weight_kg,
    bustCm: profile.bust_cm,
    underbustCm: profile.underbust_cm,
    waistCm: profile.waist_cm,
    hipsCm: profile.hips_cm,
    thighCm: profile.thigh_cm,
    bodiceLengthFrontCm: profile.bodice_length_front_cm,
    sleeveLengthCm: profile.sleeve_length_cm,
    pantLengthCm: profile.pant_length_cm,
    inseamCm: profile.inseam_cm,
    shoulderWidthCm: profile.shoulder_width_cm,
    topSize: profile.top_size,
    bottomSize: profile.bottom_size,
    dressSize: profile.dress_size,
    shoeSize: profile.shoe_size,
    shoeSizeSystem: profile.shoe_size_system === "EU" ? "EU" : "US",
    maleMeasurements: { ...emptyMaleMeasurements, ...(profile.male_measurements || {}) },
    proportions: profile.proportions,
    fitNotes: profile.fit_notes,
    styleNotes: profile.style_notes,
  };
}

export async function saveUserProfile(userId: string, profile: UserProfile) {
  const supabase = await createClient();
  const { error } = await supabase.from("user_profiles").upsert({
    user_id: userId,
    display_name: profile.displayName,
    sex: profile.sex,
    timezone: profile.timezone,
    location_name: profile.locationName,
    latitude: profile.latitude,
    longitude: profile.longitude,
    measurement_unit: profile.measurementUnit,
    height_cm: profile.heightCm,
    weight_kg: profile.weightKg,
    bust_cm: profile.bustCm,
    underbust_cm: profile.underbustCm,
    waist_cm: profile.waistCm,
    hips_cm: profile.hipsCm,
    thigh_cm: profile.thighCm,
    bodice_length_front_cm: profile.bodiceLengthFrontCm,
    sleeve_length_cm: profile.sleeveLengthCm,
    pant_length_cm: profile.pantLengthCm,
    inseam_cm: profile.inseamCm,
    shoulder_width_cm: profile.shoulderWidthCm,
    top_size: profile.topSize,
    bottom_size: profile.bottomSize,
    dress_size: profile.dressSize,
    shoe_size: profile.shoeSize,
    shoe_size_system: profile.shoeSizeSystem,
    male_measurements: profile.maleMeasurements,
    proportions: profile.proportions,
    fit_notes: profile.fitNotes,
    style_notes: profile.styleNotes,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw new Error(`Profile save failed: ${error.message}`);
  return profile;
}
