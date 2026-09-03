import { requireCurrentUserId } from "@/lib/auth/require-current-user";

export const runtime = "nodejs";

type GoogleSuggestion = {
  placePrediction?: {
    placeId?: string;
    text?: { text?: string };
    structuredFormat?: {
      mainText?: { text?: string };
      secondaryText?: { text?: string };
    };
  };
};

type PhotonFeature = {
  properties?: Record<string, string | number | undefined>;
  geometry?: { coordinates?: [number, number] };
};

type PlaceSuggestion = {
  placeId: string;
  text: string;
  name: string;
  secondaryText: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  provider: "openstreetmap";
};

function joinUnique(parts: Array<string | number | undefined>) {
  return [...new Set(parts.filter((part) => part !== undefined && part !== "").map(String).map((part) => part.trim()).filter(Boolean))].join(", ");
}

function distanceFromBias(suggestion: PlaceSuggestion, latitude: number, longitude: number) {
  if (suggestion.latitude === null || suggestion.longitude === null) return Number.POSITIVE_INFINITY;
  const latDelta = suggestion.latitude - latitude;
  const lonDelta = (suggestion.longitude - longitude) * Math.cos((latitude * Math.PI) / 180);
  return Math.hypot(latDelta, lonDelta);
}

function rankSuggestion(suggestion: PlaceSuggestion, input: string, latitude: number, longitude: number, hasBias: boolean) {
  const query = input.toLocaleLowerCase().trim();
  const name = suggestion.name.toLocaleLowerCase().trim();
  const nameScore = name === query ? 100 : name.startsWith(query) ? 80 : name.includes(query) ? 60 : 0;
  const proximityScore = hasBias ? Math.max(0, 30 - distanceFromBias(suggestion, latitude, longitude)) : 0;
  return nameScore + proximityScore;
}

async function photonSuggestions(input: string, locality: string, latitude: number, longitude: number, hasBias: boolean) {
  const photonUrl = new URL("https://photon.komoot.io/api/");
  photonUrl.searchParams.set("q", locality ? `${input}, ${locality}` : input);
  photonUrl.searchParams.set("limit", "12");
  photonUrl.searchParams.set("lang", "en");
  if (hasBias) {
    photonUrl.searchParams.set("lat", String(latitude));
    photonUrl.searchParams.set("lon", String(longitude));
  }
  const response = await fetch(photonUrl, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(6000) });
  if (!response.ok) return [];
  const body = await response.json();
  return ((body.features ?? []) as PhotonFeature[]).flatMap((feature): PlaceSuggestion[] => {
    const properties = feature.properties ?? {};
    const coordinates = feature.geometry?.coordinates;
    const name = typeof properties.name === "string" ? properties.name : "";
    const street = joinUnique([properties.housenumber, properties.street]);
    const locality = joinUnique([properties.district, properties.city, properties.state, properties.postcode, properties.country]);
    const address = joinUnique([street, locality]);
    if (!name && !address) return [];
    return [{
      placeId: `photon:${properties.osm_type || "place"}:${properties.osm_id || `${name}:${address}`}`,
      text: joinUnique([name, address]),
      name: name || street || locality,
      secondaryText: address || locality,
      address,
      latitude: Array.isArray(coordinates) && typeof coordinates[1] === "number" ? coordinates[1] : null,
      longitude: Array.isArray(coordinates) && typeof coordinates[0] === "number" ? coordinates[0] : null,
      provider: "openstreetmap" as const,
    }];
  }).sort((a, b) => rankSuggestion(b, input, latitude, longitude, hasBias) - rankSuggestion(a, input, latitude, longitude, hasBias)).slice(0, 5);
}

export async function GET(request: Request) {
  try {
    await requireCurrentUserId();
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    const url = new URL(request.url);
    const input = (url.searchParams.get("input") || "").trim();
    const sessionToken = (url.searchParams.get("sessionToken") || "").trim();
    const locality = (url.searchParams.get("locality") || "").trim().slice(0, 120);
    if (input.length < 3 || input.length > 120 || sessionToken.length < 10 || sessionToken.length > 128) {
      return Response.json({ error: "Enter at least three characters." }, { status: 400 });
    }

    const latitude = Number(url.searchParams.get("latitude"));
    const longitude = Number(url.searchParams.get("longitude"));
    const hasBias = Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
    if (!apiKey) return Response.json({ suggestions: await photonSuggestions(input, locality, latitude, longitude, hasBias) });

    const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text",
      },
      body: JSON.stringify({
        input,
        languageCode: "en",
        regionCode: "US",
        sessionToken,
        ...(hasBias ? {
          origin: { latitude, longitude },
          locationBias: { circle: { center: { latitude, longitude }, radius: 35000 } },
        } : {}),
      }),
      signal: AbortSignal.timeout(6000),
    });
    const body = await response.json();
    if (!response.ok) {
      console.error("Google Places autocomplete unavailable.", { status: response.status, error: body?.error?.status });
      return Response.json({ error: "Address suggestions are unavailable right now." }, { status: 502 });
    }
    const suggestions = ((body.suggestions ?? []) as GoogleSuggestion[]).flatMap((suggestion) => {
      const prediction = suggestion.placePrediction;
      if (!prediction?.placeId || !prediction.text?.text) return [];
      return [{
        placeId: prediction.placeId,
        text: prediction.text.text,
        name: prediction.structuredFormat?.mainText?.text || prediction.text.text,
        secondaryText: prediction.structuredFormat?.secondaryText?.text || "",
        address: null,
        latitude: null,
        longitude: null,
        provider: "google" as const,
      }];
    }).slice(0, 5);
    return Response.json({ suggestions });
  } catch (error) {
    console.error("Place autocomplete unavailable.", error);
    return Response.json({ error: "Address suggestions are unavailable right now." }, { status: 503 });
  }
}
