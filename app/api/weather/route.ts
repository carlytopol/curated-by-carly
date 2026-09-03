import { requireCurrentUserId } from "@/lib/auth/require-current-user";

export async function GET(request: Request) {
  try {
    await requireCurrentUserId();
    const params = new URL(request.url).searchParams;
    const latitude = Number(params.get("latitude"));
    const longitude = Number(params.get("longitude"));
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return Response.json({ error: "A valid location is required." }, { status: 400 });
    }
    const endpoint = new URL("https://api.open-meteo.com/v1/forecast");
    endpoint.search = new URLSearchParams({
      latitude: String(latitude), longitude: String(longitude), timezone: "auto",
      temperature_unit: "fahrenheit", wind_speed_unit: "mph", precipitation_unit: "inch",
      current: "temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
      hourly: "temperature_2m,apparent_temperature,precipitation_probability,relative_humidity_2m,wind_speed_10m",
      daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
      forecast_days: "1",
    }).toString();
    const response = await fetch(endpoint, { next: { revalidate: 900 } });
    if (!response.ok) throw new Error("Weather provider unavailable.");
    return Response.json(await response.json());
  } catch {
    return Response.json({ error: "Weather is unavailable right now." }, { status: 502 });
  }
}
