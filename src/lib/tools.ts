import { z } from "zod";
import { jsonSchema, type ToolSet } from "ai";

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

async function braveSearch(query: string, count: number) {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(count));

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": BRAVE_API_KEY!,
    },
  });

  if (!res.ok) {
    return { query, results: [] };
  }

  const data = await res.json();
  const results = (data.web?.results ?? []).map(
    (r: { title: string; url: string; description?: string }) => ({
      title: r.title,
      url: r.url,
      description: r.description?.replace(/<[^>]*>/g, "") ?? "",
    })
  );

  return { query, results };
}

const searchInputSchema = {
  type: "object" as const,
  properties: {
    query: { type: "string" as const, description: "The search query" },
    count: {
      type: "number" as const,
      description: "Number of results to return (default 5)",
    },
  },
  required: ["query"] as string[],
};

// WMO weather codes to descriptions
const WMO_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

async function getWeather(location: string) {
  // Geocode location name to coordinates
  const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geoUrl.searchParams.set("name", location);
  geoUrl.searchParams.set("count", "1");

  const geoRes = await fetch(geoUrl.toString());
  if (!geoRes.ok) return { error: "Geocoding failed" };

  const geoData = await geoRes.json();
  const place = geoData.results?.[0];
  if (!place) return { error: `Location not found: ${location}` };

  // Fetch current weather + daily forecast
  const wxUrl = new URL("https://api.open-meteo.com/v1/forecast");
  wxUrl.searchParams.set("latitude", String(place.latitude));
  wxUrl.searchParams.set("longitude", String(place.longitude));
  wxUrl.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m"
  );
  wxUrl.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
  );
  wxUrl.searchParams.set("temperature_unit", "fahrenheit");
  wxUrl.searchParams.set("wind_speed_unit", "mph");
  wxUrl.searchParams.set("timezone", "auto");
  wxUrl.searchParams.set("forecast_days", "5");

  const wxRes = await fetch(wxUrl.toString());
  if (!wxRes.ok) return { error: "Weather API failed" };

  const wx = await wxRes.json();
  const c = wx.current;

  return {
    location: `${place.name}, ${place.admin1 ?? ""} ${place.country ?? ""}`.trim(),
    current: {
      temperature: `${c.temperature_2m}°F`,
      feels_like: `${c.apparent_temperature}°F`,
      humidity: `${c.relative_humidity_2m}%`,
      wind: `${c.wind_speed_10m} mph (gusts ${c.wind_gusts_10m} mph)`,
      condition: WMO_CODES[c.weather_code] ?? "Unknown",
    },
    forecast: wx.daily.time.map((date: string, i: number) => ({
      date,
      high: `${wx.daily.temperature_2m_max[i]}°F`,
      low: `${wx.daily.temperature_2m_min[i]}°F`,
      precipitation_chance: `${wx.daily.precipitation_probability_max[i]}%`,
      condition: WMO_CODES[wx.daily.weather_code[i]] ?? "Unknown",
    })),
  };
}

const weatherInputSchema = {
  type: "object" as const,
  properties: {
    location: {
      type: "string" as const,
      description: "City name or location (e.g. 'San Francisco' or 'Paris, France')",
    },
  },
  required: ["location"] as string[],
};

export function getBuiltinTools(): ToolSet {
  const tools: ToolSet = {};

  if (BRAVE_API_KEY) {
    tools.web_search = {
      description:
        "Search the web using Brave Search. Use this when the user asks about current events, needs up-to-date information, or asks you to look something up online. Do NOT use this for weather — use the get_weather tool instead.",
      inputSchema: jsonSchema(searchInputSchema),
      execute: async (input: { query: string; count?: number }) => {
        return braveSearch(input.query, input.count ?? 5);
      },
    } satisfies ToolSet[string];
  }

  tools.get_weather = {
    description:
      "Get current weather conditions and 5-day forecast for a location. Always use this tool when the user asks about weather.",
    inputSchema: jsonSchema(weatherInputSchema),
    execute: async (input: { location: string }) => {
      return getWeather(input.location);
    },
  } satisfies ToolSet[string];

  return tools;
}
