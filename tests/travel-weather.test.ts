import assert from "node:assert/strict";
import test from "node:test";
import { getTravelWeatherContext } from "../lib/weather/travel-weather";

function json(data: unknown) {
  return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
}

test("Travel uses a destination forecast when the trip is within the forecast window", async () => {
  const calls: string[] = [];
  const fetcher: typeof fetch = async (input) => {
    const url = String(input); calls.push(url);
    if (url.includes("geocoding-api")) return json({ results: [{ name: "Portland", admin1: "Maine", country: "United States", latitude: 43.66, longitude: -70.25, timezone: "America/New_York" }] });
    return json({ timezone: "America/New_York", daily: { time: ["2026-07-20"], temperature_2m_max: [78], temperature_2m_min: [61], precipitation_probability_max: [20], weather_code: [2] } });
  };
  const result = await getTravelWeatherContext("Portland, Maine", "2026-07-20", "2026-07-20", { fetcher, now: new Date("2026-07-17T12:00:00Z") });
  assert.equal(result.source, "forecast");
  assert.equal(result.forecast?.[0].highF, 78);
  assert.equal(calls.some((url) => url.includes("api.open-meteo.com/v1/forecast")), true);
});

test("Travel uses historical high and low averages beyond the forecast window", async () => {
  let archiveCalls = 0;
  const fetcher: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes("geocoding-api")) return json({ results: [{ name: "Paris", country: "France", latitude: 48.86, longitude: 2.35, timezone: "Europe/Paris" }] });
    archiveCalls += 1;
    return json({ daily: { temperature_2m_max: [70, 72], temperature_2m_min: [52, 54] } });
  };
  const result = await getTravelWeatherContext("Paris", "2026-10-20", "2026-10-21", { fetcher, now: new Date("2026-07-17T12:00:00Z") });
  assert.equal(result.source, "historical");
  assert.equal(result.historical?.averageHighF, 71);
  assert.equal(result.historical?.averageLowF, 53);
  assert.equal(archiveCalls, 5);
});
