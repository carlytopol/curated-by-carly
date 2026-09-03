import { requireCurrentUserId } from "@/lib/auth/require-current-user";

export async function GET(request: Request) {
  try {
    await requireCurrentUserId();
    const query = new URL(request.url).searchParams.get("q")?.trim();
    if (!query || query.length < 2 || query.length > 150) {
      return Response.json({ error: "Enter a city or postal code." }, { status: 400 });
    }
    const endpoint = new URL("https://geocoding-api.open-meteo.com/v1/search");
    endpoint.search = new URLSearchParams({ name: query, count: "1", language: "en", format: "json" }).toString();
    const response = await fetch(endpoint, { next: { revalidate: 86400 } });
    if (!response.ok) throw new Error("Geocoding unavailable.");
    const body = await response.json() as { results?: Array<{ latitude: number; longitude: number; name: string; admin1?: string; country?: string }> };
    const result = body.results?.[0];
    if (!result) return Response.json({ error: "We could not find that location." }, { status: 404 });
    return Response.json({ latitude: result.latitude, longitude: result.longitude, label: [result.name, result.admin1, result.country].filter(Boolean).join(", ") });
  } catch {
    return Response.json({ error: "Location search is unavailable right now." }, { status: 502 });
  }
}
