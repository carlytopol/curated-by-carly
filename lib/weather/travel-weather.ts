const DAY_MS = 86_400_000;
const MAX_FORECAST_DAYS = 16;
const HISTORICAL_SAMPLE_YEARS = 5;

type Fetcher = typeof fetch;

type DailyWeather = {
  time?: string[];
  temperature_2m_max?: number[];
  temperature_2m_min?: number[];
  precipitation_probability_max?: number[];
  weather_code?: number[];
};

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function average(values: number[]) {
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function finiteValues(values: unknown) {
  return Array.isArray(values) ? values.filter((value): value is number => typeof value === "number" && Number.isFinite(value)) : [];
}

async function readJson(response: Response) {
  if (!response.ok) throw new Error(`Weather provider returned ${response.status}.`);
  return response.json() as Promise<Record<string, unknown>>;
}

export type TravelWeatherContext = {
  source: "forecast" | "historical";
  destination: string;
  timezone: string | null;
  startDate: string;
  endDate: string;
  forecast?: Array<{
    date: string;
    highF: number | null;
    lowF: number | null;
    precipitationChance: number | null;
    weatherCode: number | null;
  }>;
  historical?: {
    averageHighF: number | null;
    averageLowF: number | null;
    sampleYears: number;
  };
};

export async function getTravelWeatherContext(
  destination: string,
  startDateValue: string,
  endDateValue: string,
  options: { fetcher?: Fetcher; now?: Date } = {},
): Promise<TravelWeatherContext> {
  const fetcher = options.fetcher ?? fetch;
  const startDate = parseDate(startDateValue);
  const endDate = parseDate(endDateValue);
  if (!destination.trim() || !startDate || !endDate || endDate < startDate) throw new Error("Invalid travel weather request.");

  const geocodeUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geocodeUrl.search = new URLSearchParams({ name: destination.trim(), count: "1", language: "en", format: "json" }).toString();
  const geocode = await readJson(await fetcher(geocodeUrl, { next: { revalidate: 86_400 } }));
  const place = Array.isArray(geocode.results) ? geocode.results[0] as Record<string, unknown> | undefined : undefined;
  const latitude = typeof place?.latitude === "number" ? place.latitude : null;
  const longitude = typeof place?.longitude === "number" ? place.longitude : null;
  if (latitude === null || longitude === null) throw new Error("Destination could not be located.");
  const resolvedDestination = [place?.name, place?.admin1, place?.country].filter((part) => typeof part === "string" && part).join(", ") || destination.trim();
  const timezone = typeof place?.timezone === "string" ? place.timezone : null;

  const now = options.now ?? new Date();
  const today = new Date(`${isoDate(now)}T12:00:00.000Z`);
  const forecastLimit = new Date(today.getTime() + (MAX_FORECAST_DAYS - 1) * DAY_MS);
  if (startDate >= today && endDate <= forecastLimit) {
    const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
    forecastUrl.search = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      timezone: "auto",
      temperature_unit: "fahrenheit",
      precipitation_unit: "inch",
      start_date: startDateValue,
      end_date: endDateValue,
      daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code",
    }).toString();
    const forecast = await readJson(await fetcher(forecastUrl, { next: { revalidate: 1800 } }));
    const daily = (forecast.daily ?? {}) as DailyWeather;
    const dates = Array.isArray(daily.time) ? daily.time : [];
    return {
      source: "forecast",
      destination: resolvedDestination,
      timezone: typeof forecast.timezone === "string" ? forecast.timezone : timezone,
      startDate: startDateValue,
      endDate: endDateValue,
      forecast: dates.map((date, index) => ({
        date,
        highF: finiteValues(daily.temperature_2m_max)[index] ?? null,
        lowF: finiteValues(daily.temperature_2m_min)[index] ?? null,
        precipitationChance: finiteValues(daily.precipitation_probability_max)[index] ?? null,
        weatherCode: finiteValues(daily.weather_code)[index] ?? null,
      })),
    };
  }

  const tripDays = Math.min(31, Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / DAY_MS)));
  const sampleEndYear = today.getUTCFullYear() - 1;
  const sampleYears = Array.from({ length: HISTORICAL_SAMPLE_YEARS }, (_, index) => sampleEndYear - index);
  const samples = await Promise.all(sampleYears.map(async (year) => {
    const sampleStart = new Date(Date.UTC(year, startDate.getUTCMonth(), startDate.getUTCDate(), 12));
    const sampleEnd = new Date(sampleStart.getTime() + tripDays * DAY_MS);
    const archiveUrl = new URL("https://archive-api.open-meteo.com/v1/archive");
    archiveUrl.search = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      timezone: "auto",
      temperature_unit: "fahrenheit",
      start_date: isoDate(sampleStart),
      end_date: isoDate(sampleEnd),
      daily: "temperature_2m_max,temperature_2m_min",
    }).toString();
    const archive = await readJson(await fetcher(archiveUrl, { next: { revalidate: 604_800 } }));
    return (archive.daily ?? {}) as DailyWeather;
  }));
  const highs = samples.flatMap((sample) => finiteValues(sample.temperature_2m_max));
  const lows = samples.flatMap((sample) => finiteValues(sample.temperature_2m_min));
  return {
    source: "historical",
    destination: resolvedDestination,
    timezone,
    startDate: startDateValue,
    endDate: endDateValue,
    historical: {
      averageHighF: average(highs),
      averageLowF: average(lows),
      sampleYears: sampleYears.length,
    },
  };
}
