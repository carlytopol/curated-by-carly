"use client";

import { useEffect, useReducer, useRef, useState, type FormEvent } from "react";
import {
  initialProfileSubmissionState,
  profileSubmissionReducer,
} from "@/lib/profile/submission-state";
import { emptyMaleMeasurements, type MaleMeasurementField, type UserProfile } from "@/types/profile";

const emptyProfile: UserProfile = {
  displayName: null, timezone: "UTC", locationName: null,
  sex: "female",
  latitude: null, longitude: null, measurementUnit: "imperial", heightCm: null, weightKg: null,
  bustCm: null, underbustCm: null, waistCm: null, hipsCm: null, thighCm: null,
  bodiceLengthFrontCm: null, sleeveLengthCm: null, pantLengthCm: null, inseamCm: null, shoulderWidthCm: null,
  topSize: null, bottomSize: null, dressSize: null, shoeSize: null, shoeSizeSystem: "US", maleMeasurements: emptyMaleMeasurements,
  proportions: null, fitNotes: null, styleNotes: null,
};

type LengthField = "bustCm" | "underbustCm" | "waistCm" | "hipsCm" | "thighCm" | "bodiceLengthFrontCm" | "sleeveLengthCm" | "pantLengthCm" | "inseamCm" | "shoulderWidthCm";

const measurements: Array<{ field: LengthField; label: string; description: string }> = [
  { field: "bustCm", label: "Bust", description: "Measurement around the fullest part of the chest." },
  { field: "underbustCm", label: "Underbust", description: "Measurement directly beneath the breasts, where the bra band sits." },
  { field: "waistCm", label: "Waist", description: "Narrowest part of the torso, just above the belly button." },
  { field: "hipsCm", label: "Hips", description: "Widest part of the lower body, usually across the fullest part of your bum." },
  { field: "thighCm", label: "Thigh", description: "Fullest part of the upper leg." },
  { field: "bodiceLengthFrontCm", label: "Bodice Length Front", description: "From the top of the shoulder, down over the bust, to the waist." },
  { field: "sleeveLengthCm", label: "Sleeve Length", description: "With the arm slightly bent, from the shoulder down to the wrist." },
  { field: "pantLengthCm", label: "Pant Length", description: "From the natural waistline down the outer side of the leg to the floor or preferred hemline." },
  { field: "inseamCm", label: "Inseam", description: "From the crotch to the ankle." },
  { field: "shoulderWidthCm", label: "Shoulder Width", description: "From one shoulder tip to the other." },
];

type MaleLengthField = MaleMeasurementField | "shoulderWidthCm" | "sleeveLengthCm" | "waistCm" | "thighCm" | "inseamCm";
const maleUpperBody: Array<{ field: MaleLengthField; label: string; description: string }> = [
  { field: "neckCm", label: "Neck", description: "Circumference around the base of the neck, usually for shirt collars." },
  { field: "chestCm", label: "Chest", description: "Around the fullest part of the chest, under the arms." },
  { field: "overarmCm", label: "Overarm", description: "Around the chest and upper arms together; often used for jacket sizing." },
  { field: "shoulderWidthCm", label: "Shoulder width", description: "Across the back from one shoulder point to the other." },
  { field: "backWidthCm", label: "Back width", description: "Across the upper back, usually between the arm joints." },
  { field: "jacketLengthCm", label: "Jacket length", description: "From the base of the neck or shoulder to the desired jacket hem." },
  { field: "frontLengthCm", label: "Front length", description: "From the shoulder down the front of the torso." },
  { field: "backLengthCm", label: "Back length", description: "From the collar seam down the center back." },
  { field: "armholeDepthCm", label: "Armhole depth", description: "The vertical depth needed for a jacket or shirt armhole." },
  { field: "bicepCm", label: "Bicep", description: "Around the fullest part of the upper arm." },
  { field: "sleeveLengthCm", label: "Sleeve length", description: "From the shoulder point to the wrist, with the elbow slightly bent." },
  { field: "wristCm", label: "Wrist or cuff", description: "Around the wrist for shirt cuffs or narrow jacket sleeves." },
];
const maleLowerBody: Array<{ field: MaleLengthField; label: string; description: string }> = [
  { field: "waistCm", label: "Natural waist", description: "Around the narrowest part of the torso." },
  { field: "trouserWaistCm", label: "Trouser waist", description: "Where the trousers will actually sit." },
  { field: "seatCm", label: "Seat or hips", description: "Around the fullest part of the buttocks and hips." },
  { field: "riseCm", label: "Rise", description: "From the front waistband, through the legs, to the back waistband." },
  { field: "frontRiseCm", label: "Front rise", description: "From the front waistband to the crotch seam." },
  { field: "backRiseCm", label: "Back rise", description: "From the crotch seam to the back waistband." },
  { field: "thighCm", label: "Thigh", description: "Around the fullest part of the upper leg." },
  { field: "kneeCm", label: "Knee", description: "Around the knee or desired trouser width at the knee." },
  { field: "calfCm", label: "Calf", description: "Around the fullest part of the lower leg, when needed." },
  { field: "trouserOutseamCm", label: "Trouser outseam", description: "From the waistband down the outside of the leg." },
  { field: "inseamCm", label: "Inseam", description: "From the crotch to the desired trouser hem." },
  { field: "bottomOpeningCm", label: "Bottom opening", description: "The desired circumference or width of the trouser hem." },
];

const inputClass = "mt-2 w-full rounded-2xl border border-[#704154]/15 bg-white px-4 py-3 outline-none focus:border-[#704154]/50";

export function ProfileForm() {
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [submission, dispatchSubmission] = useReducer(
    profileSubmissionReducer,
    initialProfileSubmissionState,
  );
  const saveInFlight = useRef(false);
  const isSaving = submission.phase === "saving";

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/profile", { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "We could not open your profile.");
      setProfile(body);
      dispatchSubmission({ type: "loaded" });
    }).catch((error) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      dispatchSubmission({
        type: "failed",
        message: error instanceof Error
          ? error.message
          : "Your profile could not be opened. Please refresh and try again.",
      });
    });
    return () => controller.abort();
  }, []);

  function update<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (saveInFlight.current) return;
    saveInFlight.current = true;
    dispatchSubmission({ type: "save" });
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "We could not save your profile yet.");
      setProfile(body);
      dispatchSubmission({ type: "saved" });
    } catch (error) {
      dispatchSubmission({
        type: "failed",
        message: error instanceof Error
          ? `${error.message} Your changes are still here.`
          : "The connection was interrupted. Your changes are still here; please try again.",
      });
    } finally {
      saveInFlight.current = false;
    }
  }

  const isImperial = profile.measurementUnit === "imperial";
  const heightValue = profile.heightCm === null ? "" : Number((isImperial ? profile.heightCm / 2.54 : profile.heightCm).toFixed(1));
  const weightValue = profile.weightKg === null ? "" : Number((isImperial ? profile.weightKg * 2.20462 : profile.weightKg).toFixed(1));
  const lengthValue = (field: LengthField) => profile[field] === null ? "" : Number((isImperial ? profile[field]! / 2.54 : profile[field]!).toFixed(1));
  const sharedMaleFields = new Set<MaleLengthField>(["shoulderWidthCm", "sleeveLengthCm", "waistCm", "thighCm", "inseamCm"]);
  const maleLengthValue = (field: MaleLengthField) => {
    const centimeters = sharedMaleFields.has(field)
      ? profile[field as "shoulderWidthCm" | "sleeveLengthCm" | "waistCm" | "thighCm" | "inseamCm"]
      : profile.maleMeasurements[field as MaleMeasurementField];
    return centimeters === null ? "" : Number((isImperial ? centimeters / 2.54 : centimeters).toFixed(1));
  };
  const updateMaleLength = (field: MaleLengthField, rawValue: string) => {
    const centimeters = rawValue ? Number(rawValue) * (isImperial ? 2.54 : 1) : null;
    if (sharedMaleFields.has(field)) {
      update(field as "shoulderWidthCm" | "sleeveLengthCm" | "waistCm" | "thighCm" | "inseamCm", centimeters);
    } else {
      setProfile((current) => ({ ...current, maleMeasurements: { ...current.maleMeasurements, [field]: centimeters } }));
    }
  };

  return (
    <form onSubmit={save} className="mt-8 space-y-8 sm:mt-12 sm:space-y-12">
      <section className="paper-panel grid gap-4 rounded-[1.5rem] p-5 sm:grid-cols-2 sm:gap-5 sm:rounded-[2rem] sm:p-9">
        <div className="sm:col-span-2"><h2 className="font-serif text-3xl text-[#54263a]">The essentials</h2><p className="mt-2 text-sm text-[#74696b]">Only add what feels useful. Every field is optional.</p></div>
        <label className="text-sm text-[#665b5e]">Name<input className={inputClass} value={profile.displayName ?? ""} onChange={(event) => update("displayName", event.target.value || null)} /></label>
        <label className="text-sm text-[#665b5e]">Home location<input className={inputClass} placeholder="New York, NY" value={profile.locationName ?? ""} onChange={(event) => update("locationName", event.target.value || null)} /></label>
        <label className="text-sm text-[#665b5e] sm:col-span-2">Profile<select className={inputClass} value={profile.sex} onChange={(event) => update("sex", event.target.value as "female" | "male")}><option value="female">Female</option><option value="male">Male</option></select></label>
      </section>

      <section className="paper-panel rounded-[1.5rem] p-5 sm:rounded-[2rem] sm:p-9">
        <div><p className="text-xs uppercase tracking-[0.24em] text-[#9a6b72]">Discreet and optional</p><h2 className="mt-3 font-serif text-3xl text-[#54263a]">Measurements and fit</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#74696b]">These details can improve fit and proportion guidance. Leave any or all of them blank.</p></div>
        <label className="mt-6 block max-w-md text-sm text-[#665b5e] sm:mt-8">Preferred units<select className={inputClass} value={profile.measurementUnit} onChange={(event) => update("measurementUnit", event.target.value as "imperial" | "metric")}><option value="imperial">Imperial (inches and pounds)</option><option value="metric">Metric (centimeters and kilograms)</option></select></label>

        <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5">
          <label className="text-sm text-[#665b5e]">Height ({isImperial ? "in" : "cm"})<input className={inputClass} type="number" min={isImperial ? 20 : 50} max={isImperial ? 108 : 275} step="0.1" value={heightValue} onChange={(event) => update("heightCm", event.target.value ? Number(event.target.value) * (isImperial ? 2.54 : 1) : null)} /></label>
          <label className="text-sm text-[#665b5e]">Weight ({isImperial ? "lb" : "kg"})<input className={inputClass} type="number" min={isImperial ? 44 : 20} max={isImperial ? 1100 : 500} step="0.1" value={weightValue} onChange={(event) => update("weightKg", event.target.value ? Number(event.target.value) / (isImperial ? 2.20462 : 1) : null)} /></label>
        </div>

        {profile.sex === "female" ? <div className="mt-7 grid gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-5">
          {measurements.map(({ field, label, description }) => (
            <label key={field} className="border border-[#a07c45]/15 bg-[#f7f0e6]/60 p-4 text-sm text-[#5f5357] sm:p-5">
              <span className="font-medium text-[#3d2b32]">{label} ({isImperial ? "in" : "cm"})</span>
              <span className="mt-1 block min-h-10 text-xs leading-5 text-[#887a7e]">{description}</span>
              <input className={inputClass} type="number" min={isImperial ? 4 : 10} max={isImperial ? 118 : 300} step="0.1" value={lengthValue(field)} onChange={(event) => update(field, event.target.value ? Number(event.target.value) * (isImperial ? 2.54 : 1) : null)} />
            </label>
          ))}
        </div> : <div className="mt-7 space-y-7 sm:mt-10 sm:space-y-10">
          {[["Upper body", maleUpperBody], ["Waist and lower body", maleLowerBody]].map(([heading, fields]) => (
            <section key={heading as string}>
              <h3 className="font-serif text-2xl text-[#54263a]">{heading as string}</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-5">
                {(fields as typeof maleUpperBody).map(({ field, label, description }) => (
                  <label key={field} className="border border-[#a07c45]/15 bg-[#f7f0e6]/60 p-4 text-sm text-[#5f5357] sm:p-5">
                    <span className="font-medium text-[#3d2b32]">{label} ({isImperial ? "in" : "cm"})</span>
                    <span className="mt-1 block min-h-10 text-xs leading-5 text-[#887a7e]">{description}</span>
                    <input className={inputClass} type="number" min={isImperial ? 2 : 5} max={isImperial ? 138 : 350} step="0.1" value={maleLengthValue(field)} onChange={(event) => updateMaleLength(field, event.target.value)} />
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>}

        <div className="mt-7 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5">
          {(["topSize", "bottomSize"] as const).map((field) => <label key={field} className="text-sm capitalize text-[#665b5e]">{field.replace("Size", " size")}<input className={inputClass} value={profile[field] ?? ""} onChange={(event) => update(field, event.target.value || null)} /></label>)}
          {profile.sex === "female" && <label className="text-sm text-[#665b5e]">Dress size<input className={inputClass} value={profile.dressSize ?? ""} onChange={(event) => update("dressSize", event.target.value || null)} /></label>}
          <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
            <label className="text-sm text-[#665b5e]">Shoe sizing<select className={inputClass} value={profile.shoeSizeSystem} onChange={(event) => update("shoeSizeSystem", event.target.value as "US" | "EU")}><option value="US">US</option><option value="EU">European</option></select></label>
            <label className="text-sm text-[#665b5e]">Shoe size ({profile.shoeSizeSystem})<input className={inputClass} value={profile.shoeSize ?? ""} onChange={(event) => update("shoeSize", event.target.value || null)} /></label>
          </div>
          <label className="text-sm text-[#665b5e] sm:col-span-2">Body proportions or fit preferences<textarea className={inputClass} rows={3} value={profile.proportions ?? ""} onChange={(event) => update("proportions", event.target.value || null)} /></label>
          <label className="text-sm text-[#665b5e] sm:col-span-2">Fit notes<textarea className={inputClass} rows={3} value={profile.fitNotes ?? ""} onChange={(event) => update("fitNotes", event.target.value || null)} /></label>
        </div>
      </section>

      <section className="salon-panel garden-panel rounded-[1.5rem] p-5 text-white sm:rounded-[2rem] sm:p-9"><h2 className="font-serif text-3xl">Style in your own words</h2><textarea className="relative z-10 mt-4 w-full rounded-2xl border border-white/35 bg-[#fffaf3] px-4 py-3 text-[#2f4039] caret-[#704154] outline-none placeholder:text-[#74696b] focus:border-white focus:ring-2 focus:ring-white/35 sm:mt-5" rows={3} placeholder="Colors, silhouettes, designers, and the way you want to feel…" value={profile.styleNotes ?? ""} onChange={(event) => update("styleNotes", event.target.value || null)} /></section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p aria-live="polite" role={submission.phase === "error" ? "alert" : "status"} className="text-sm text-[#74696b]">{submission.message}</p>
        <button className="brass-button disabled:cursor-wait disabled:opacity-60" type="submit" disabled={isSaving}>
          {isSaving ? "Saving privately…" : submission.phase === "error" ? "Try saving again" : "Save private profile"}
        </button>
      </div>
    </form>
  );
}
