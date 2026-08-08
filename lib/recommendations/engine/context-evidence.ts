import type { DailyAgendaItem } from "@/types/daily-agenda";
import type { ContextConstraint, ContextEvidence, EvidenceValue, VenueRule, WeatherEvidence } from "./types";
import { buildDressingPosture } from "./dressing-posture";

type WeatherPayload = {
  current?: Record<string, number | undefined>;
  daily?: Record<string, Array<number | undefined> | undefined>;
  hourly?: Record<string, Array<number | string | undefined> | undefined>;
};

function evidence<T>(
  value: T | null | undefined,
  provenance: EvidenceValue<T>["provenance"],
  confidence: EvidenceValue<T>["confidence"],
  source: string,
): EvidenceValue<T> {
  return { value: value ?? null, provenance: value == null ? "unknown" : provenance, confidence: value == null ? "low" : confidence, source };
}

function contains(text: string, pattern: RegExp) {
  return pattern.test(text.toLowerCase());
}

function eventHour(weather: WeatherPayload | null | undefined, startsAt: string | null) {
  if (!startsAt) return {};
  const times = weather?.hourly?.time ?? [];
  if (!times.length) return {};
  const target = new Date(startsAt).getTime();
  let index = -1;
  let distance = Infinity;
  times.forEach((value, candidate) => {
    if (typeof value !== "string") return;
    const difference = Math.abs(new Date(value).getTime() - target);
    if (difference < distance) {
      index = candidate;
      distance = difference;
    }
  });
  if (index < 0 || distance > 90 * 60 * 1000) return {};
  const hourly = weather?.hourly ?? {};
  return Object.fromEntries(Object.entries(hourly).map(([key, values]) => [key, values?.[index]]));
}

function constraint(code: string, statement: string, provenance: ContextConstraint["provenance"], source: string): ContextConstraint {
  return { code, statement, provenance, source };
}

export function buildContextEvidence(input: {
  agendaItem: DailyAgendaItem;
  notes?: string | null;
  statedDressCode?: string | null;
  intention?: string | null;
  weather?: WeatherPayload | null;
  venueRules?: VenueRule[];
}): ContextEvidence {
  const { agendaItem } = input;
  const combined = [agendaItem.title, agendaItem.location, input.notes, input.intention].filter(Boolean).join(" ");
  const venueRules = input.venueRules ?? [];
  const explicitOutdoor = contains(combined, /\b(outdoor|outside|stadium|ballpark|park|garden|patio|terrace|beach|pool)\b/);
  const explicitIndoor = contains(combined, /\b(indoor|inside|ballroom|museum|office|theatre|theater)\b/);
  const verifiedSetting = venueRules.find((rule) => rule.kind === "setting" && (rule.effect === "indoor" || rule.effect === "outdoor"));
  const setting = verifiedSetting?.effect === "outdoor" || verifiedSetting?.effect === "indoor"
    ? evidence<"indoor" | "outdoor" | "mixed">(verifiedSetting.effect, "verified", verifiedSetting.confidence, verifiedSetting.sourceUrl)
    : explicitOutdoor || explicitIndoor
      ? evidence<"indoor" | "outdoor" | "mixed">(explicitOutdoor && explicitIndoor ? "mixed" : explicitOutdoor ? "outdoor" : "indoor", "inferred", "medium", "event language")
      : evidence<"indoor" | "outdoor" | "mixed">(null, "unknown", "low", "not supplied");

  const userNoBag = contains(combined, /\b(no bag|cannot carry a bag|can't carry a bag|can’t carry a bag|without a bag|bags? (?:are )?(?:not allowed|prohibited))\b/);
  const verifiedBagRule = venueRules.find((rule) => rule.kind === "bag-policy" && (rule.effect === "no-bag" || rule.effect === "small-bag-only"));
  const bagAllowed = userNoBag
    ? evidence(false, "user", "high", "user notes")
    : verifiedBagRule
      ? evidence(verifiedBagRule.effect !== "no-bag", "verified", verifiedBagRule.confidence, verifiedBagRule.sourceUrl)
      : evidence<boolean>(null, "unknown", "low", "not verified");
  const pocketsRequired = contains(combined, /\b(need|require|must have|with)\s+pockets?\b|\bpockets?\s+(for|required|needed)\b/)
    ? evidence(true, "user", "high", "user notes")
    : bagAllowed.value === false
      ? evidence(true, bagAllowed.provenance, "medium", bagAllowed.source)
      : evidence<boolean>(null, "unknown", "low", "not supplied");
  const walking = contains(combined, /\b(long walk|walking heavy|walking-heavy|all day walking|lots of walking|stadium|airport|sightseeing)\b/)
    ? evidence("high" as const, "inferred", "medium", "event and venue language")
    : contains(combined, /\b(walk|standing|concert|festival|commute|shopping|out and about)\b/)
      ? evidence("moderate" as const, "inferred", "medium", "event language")
      : evidence<"low" | "moderate" | "high">(null, "unknown", "low", "not supplied");

  const current = input.weather?.current ?? {};
  const atEvent = eventHour(input.weather, agendaItem.startTime);
  const daily = input.weather?.daily ?? {};
  const weather: WeatherEvidence = {
    temperature: evidence(
      typeof atEvent.temperature_2m === "number" ? atEvent.temperature_2m : current.temperature_2m,
      "verified", "high", typeof atEvent.temperature_2m === "number" ? "event-time weather service" : "weather service",
    ),
    feelsLike: evidence(
      typeof atEvent.apparent_temperature === "number" ? atEvent.apparent_temperature : current.apparent_temperature,
      "verified", "high", typeof atEvent.apparent_temperature === "number" ? "event-time weather service" : "weather service",
    ),
    high: evidence(daily.temperature_2m_max?.[0], "verified", "high", "weather service"),
    low: evidence(daily.temperature_2m_min?.[0], "verified", "high", "weather service"),
    precipitationChance: evidence(
      typeof atEvent.precipitation_probability === "number"
        ? atEvent.precipitation_probability
        : current.precipitation_probability ?? daily.precipitation_probability_max?.[0],
      "verified",
      "high",
      "weather service",
    ),
    windSpeed: evidence(
      typeof atEvent.wind_speed_10m === "number" ? atEvent.wind_speed_10m : current.wind_speed_10m,
      "verified", "high", "weather service",
    ),
    humidity: evidence(
      typeof atEvent.relative_humidity_2m === "number" ? atEvent.relative_humidity_2m : current.relative_humidity_2m,
      "verified", "high", "weather service",
    ),
  };
  const measuredHeat = Math.max(
    weather.temperature.value ?? -Infinity,
    weather.feelsLike.value ?? -Infinity,
    weather.high.value ?? -Infinity,
  );
  const statedExtremeHeat = contains(combined, /\b(over|above)\s*90\b|\b9\d\s*(?:°|degrees?)|\bvery hot\b|\bextreme heat\b|\bhigh heat\b/);
  const heatSeverity = measuredHeat >= 90 || statedExtremeHeat
    ? "extreme"
    : measuredHeat >= 82 ? "hot" : measuredHeat >= 75 ? "warm" : "none";
  const stadium = contains(combined, /\b(stadium|ballpark|truist park|arena concert)\b/);
  const rejectsFormalOccasionwear = contains(
    combined,
    /\b(?:too|overly)\s+formal\b|\bformal\s+(?:dresses?|wear|garments?|pieces?)\b[\s\S]{0,120}\b(?:should\s+not|shouldn['’]?t|do\s+not|don['’]?t|avoid|only|unless)\b|\b(?:should\s+not|shouldn['’]?t|do\s+not|don['’]?t|avoid)\b[\s\S]{0,120}\bformal\s+(?:dresses?|wear|garments?|pieces?)\b/,
  );
  const explicitlyRequestsFormal = contains(
    combined,
    /\b(?:black.?tie|gala|formal dress code|dress formally|formal wedding|formal dinner)\b/,
  ) && !rejectsFormalOccasionwear;
  const polished = contains(combined, /\b(polished|put together|elevated|chic)\b/);
  const casual = contains(combined, /\b(casual|relaxed|not overdone|not overly formal|not over the top)\b/);
  const requestedPolish = polished && casual ? "polished-casual"
    : polished ? "polished"
      : explicitlyRequestsFormal ? "formal"
        : rejectsFormalOccasionwear ? "polished-casual"
        : casual ? "polished-casual" : null;
  const hard: ContextConstraint[] = [];
  const strongSoft: ContextConstraint[] = [];
  const preferences: ContextConstraint[] = [];
  if (pocketsRequired.value) hard.push(constraint("verified-pockets-required", "The complete look must have verified secure pockets.", pocketsRequired.provenance, pocketsRequired.source));
  if (bagAllowed.value === false) hard.push(constraint("no-bag", "Do not include a bag.", bagAllowed.provenance, bagAllowed.source));
  if (stadium) hard.push(constraint("stadium-walking-footwear", "Footwear must support stadium walking and prolonged standing.", "inferred", "venue and event language"));
  if (stadium && heatSeverity === "extreme") hard.push(constraint("no-hot-stadium-footwear", "No boots, stilettos, delicate pumps, or formal footwear.", "inferred", "combined venue and event-time heat"));
  if (heatSeverity === "extreme") {
    hard.push(constraint("no-heat-inappropriate-long-sleeves", "No heat-inappropriate long sleeves or heavy layers.", weather.temperature.provenance, weather.temperature.source));
    strongSoft.push(constraint("avoid-jeans-extreme-heat", "Avoid full-length jeans in 90°F+ conditions.", weather.temperature.provenance, weather.temperature.source));
    strongSoft.push(constraint("prefer-breathable-lightweight", "Prefer breathable tops and lightweight shorts, skirts, or dresses.", weather.temperature.provenance, weather.temperature.source));
  }
  if ((weather.humidity.value ?? 0) >= 70) strongSoft.push(constraint("high-humidity-breathability", "Avoid fitted, heat-retaining fabrics in high humidity.", "verified", weather.humidity.source));
  if ((weather.precipitationChance.value ?? 0) >= 55) strongSoft.push(constraint("rain-practicality", "Choose rain-tolerant footwear and hems.", "verified", weather.precipitationChance.source));
  if (requestedPolish) strongSoft.push(constraint("requested-polish", "The whole look must feel intentional and polished at the requested level.", "user", "event notes and intention"));
  if (contains(combined, /\bno jeans?\b/)) hard.push(constraint("user-no-jeans", "Do not include jeans.", "user", "user correction"));
  if (contains(combined, /\bno (?:long sleeves?|long-sleeved|long sleeve)\b/)) hard.push(constraint("user-no-long-sleeves", "Do not include long sleeves.", "user", "user correction"));
  if (contains(combined, /\bno slides?\b|slides? (?:are|feel|is) too casual\b/)) hard.push(constraint("user-no-slides", "Do not include slides.", "user", "user correction"));
  if (contains(combined, /\bno boots?\b/)) hard.push(constraint("user-no-boots", "Do not include boots.", "user", "user correction"));
  if (rejectsFormalOccasionwear) hard.push(constraint(
    "user-no-formal-occasionwear",
    "Do not use formal or occasion-only garments for this non-formal event.",
    "user",
    "user correction",
  ));
  if (contains(combined, /\bfun\b/)) preferences.push(constraint("fun", "The look should feel fun.", "user", "user notes"));
  if (contains(combined, /\bnot over(?:done| the top)\b/)) preferences.push(constraint("not-overdone", "The look should not feel overdone.", "user", "user notes"));

  const unknowns = [
    setting.value == null ? "indoor/outdoor setting" : null,
    walking.value == null ? "walking requirement" : null,
    weather.temperature.value == null && weather.high.value == null ? "temperature" : null,
    weather.precipitationChance.value == null ? "precipitation" : null,
    bagAllowed.value == null ? "bag policy" : null,
  ].filter((value): value is string => Boolean(value));

  const partial: Omit<ContextEvidence, "dressingPosture"> = {
    agendaItem,
    userNotes: evidence(input.notes, "user", "high", "event notes"),
    statedDressCode: input.statedDressCode
      ? evidence(input.statedDressCode, "user", "high", "user dress code")
      : evidence(agendaItem.dressCodeInference.dressCode, "inferred", agendaItem.dressCodeInference.confidence, agendaItem.dressCodeInference.reasonCode),
    intention: evidence(input.intention, "user", "high", "current session"),
    venue: evidence(agendaItem.location, "user", "high", "agenda"),
    setting,
    walking,
    bagAllowed,
    pocketsRequired,
    weather,
    constraintMatrix: { heatSeverity, requestedPolish, hard, strongSoft, preferences },
    venueRules,
    unknowns,
  };
  return { ...partial, dressingPosture: buildDressingPosture(partial) };
}
