import { jsonSchema, type ToolSet } from "ai";
import { db } from "@/lib/db";
import { polls } from "@/lib/db/schema";

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

// HTML entity decoder for Open Trivia DB responses
function decodeHtml(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&eacute;/g, "\u00E9");
}

async function getTrivia(amount: number, difficulty?: string, category?: number) {
  const url = new URL("https://opentdb.com/api.php");
  url.searchParams.set("amount", String(amount));
  url.searchParams.set("type", "multiple");
  if (difficulty) url.searchParams.set("difficulty", difficulty);
  if (category) url.searchParams.set("category", String(category));

  const res = await fetch(url.toString());
  if (!res.ok) return { error: "Trivia API failed" };

  const data = await res.json();
  if (data.response_code !== 0) return { error: "No trivia questions available" };

  return {
    questions: data.results.map(
      (q: {
        question: string;
        correct_answer: string;
        incorrect_answers: string[];
        category: string;
        difficulty: string;
      }) => ({
        question: decodeHtml(q.question),
        correct_answer: decodeHtml(q.correct_answer),
        incorrect_answers: q.incorrect_answers.map(decodeHtml),
        category: decodeHtml(q.category),
        difficulty: q.difficulty,
      })
    ),
  };
}

const RIDDLES = [
  { riddle: "I have cities but no houses, forests but no trees, and water but no fish. What am I?", answer: "A map" },
  { riddle: "I speak without a mouth and hear without ears. I have no body, but I come alive with the wind. What am I?", answer: "An echo" },
  { riddle: "The more you take, the more you leave behind. What am I?", answer: "Footsteps" },
  { riddle: "I have a head and a tail but no body. What am I?", answer: "A coin" },
  { riddle: "What has keys but no locks, space but no room, and you can enter but can't go inside?", answer: "A keyboard" },
  { riddle: "I am not alive, but I grow; I don't have lungs, but I need air; I don't have a mouth, but water kills me. What am I?", answer: "Fire" },
  { riddle: "What can travel around the world while staying in a corner?", answer: "A stamp" },
  { riddle: "I have hands but cannot clap. What am I?", answer: "A clock" },
  { riddle: "What has a heart that doesn't beat?", answer: "An artichoke" },
  { riddle: "I follow you all the time and copy your every move, but you can't touch me or catch me. What am I?", answer: "Your shadow" },
  { riddle: "What dies but is never buried?", answer: "A battery" },
  { riddle: "I have a bed but never sleep, a mouth but never eat. What am I?", answer: "A river" },
  { riddle: "What has an eye but cannot see?", answer: "A needle" },
  { riddle: "What can you break without touching it?", answer: "A promise" },
  { riddle: "What begins with T, ends with T, and has T in it?", answer: "A teapot" },
  { riddle: "I am always hungry, I must always be fed. The finger I touch will soon turn red. What am I?", answer: "Fire" },
  { riddle: "What gets wetter the more it dries?", answer: "A towel" },
  { riddle: "I have no life, but I can die. What am I?", answer: "A battery" },
  { riddle: "What has teeth but cannot bite?", answer: "A comb" },
  { riddle: "What room can no one enter?", answer: "A mushroom" },
  { riddle: "I shrink smaller every time I take a bath. What am I?", answer: "Soap" },
  { riddle: "What can fill a room but takes up no space?", answer: "Light" },
  { riddle: "What has a neck but no head?", answer: "A bottle" },
  { riddle: "What invention lets you look right through a wall?", answer: "A window" },
  { riddle: "What is seen in the middle of March and April that can't be seen at the beginning or end of either month?", answer: "The letter R" },
  { riddle: "They come out at night without being called and are lost in the day without being stolen. What are they?", answer: "Stars" },
  { riddle: "What has four fingers and a thumb but isn't alive?", answer: "A glove" },
  { riddle: "I can be cracked, made, told, and played. What am I?", answer: "A joke" },
  { riddle: "What goes up but never comes back down?", answer: "Your age" },
  { riddle: "What belongs to you but is used more by others?", answer: "Your name" },
];

const DARK_QUOTES = [
  { quote: "I am become death, the destroyer of worlds.", attribution: "J. Robert Oppenheimer" },
  { quote: "Death is nothing, but to live defeated and inglorious is to die daily.", attribution: "Napoleon Bonaparte" },
  { quote: "It is not death that a man should fear, but he should fear never beginning to live.", attribution: "Marcus Aurelius" },
  { quote: "Normal is an illusion. What is normal for the spider is chaos for the fly.", attribution: "Charles Addams" },
  { quote: "Be careful what you wish for. The stars might be listening.", attribution: "Crypt Keeper Proverb" },
  { quote: "Death must be so beautiful. To lie in the soft brown earth, with the grasses waving above one's head, and listen to silence.", attribution: "Oscar Wilde" },
  { quote: "We all go a little mad sometimes.", attribution: "Norman Bates" },
  { quote: "In the end, we all become stories.", attribution: "Margaret Atwood" },
  { quote: "The boundaries which divide Life from Death are at best shadowy and vague. Who shall say where the one ends, and where the other begins?", attribution: "Edgar Allan Poe" },
  { quote: "I would rather walk with a friend in the dark, than alone in the light.", attribution: "Helen Keller" },
  { quote: "Do not pity the dead. Pity the living, and above all, those who live without love.", attribution: "Albus Dumbledore" },
  { quote: "Every man's life ends the same way. It is only the details of how he lived and how he died that distinguish one man from another.", attribution: "Ernest Hemingway" },
  { quote: "The fear of death follows from the fear of life. A man who lives fully is prepared to die at any time.", attribution: "Mark Twain" },
  { quote: "DEATH ONLY NEEDS TO HAPPEN TO YOU ONCE.", attribution: "Terry Pratchett, Mort" },
  { quote: "I'm not afraid of death; I just don't want to be there when it happens.", attribution: "Woody Allen" },
  { quote: "They say you die twice. Once when you stop breathing and again when someone says your name for the last time.", attribution: "Banksy" },
  { quote: "Horror is like a serpent; always shedding its skin, always becoming something new.", attribution: "Dario Argento" },
  { quote: "Whatever you do in life will be insignificant, but it is very important that you do it.", attribution: "Mahatma Gandhi" },
  { quote: "Men fear death as children fear to go in the dark.", attribution: "Francis Bacon" },
  { quote: "The living are not what I worry about. It's the dead that keep me up at night.", attribution: "Crypt Keeper Proverb" },
  { quote: "Life is pleasant. Death is peaceful. It's the transition that's troublesome.", attribution: "Isaac Asimov" },
  { quote: "One need not be a chamber to be haunted.", attribution: "Emily Dickinson" },
  { quote: "The oldest and strongest emotion of mankind is fear, and the oldest and strongest kind of fear is fear of the unknown.", attribution: "H.P. Lovecraft" },
  { quote: "I have never killed anyone, but I have read some obituary notices with great satisfaction.", attribution: "Clarence Darrow" },
  { quote: "Monsters are real, and ghosts are real too. They live inside us, and sometimes, they win.", attribution: "Stephen King" },
  { quote: "Death is but a door. Time is but a window. I'll be back.", attribution: "Vigo the Carpathian" },
  { quote: "To die would be an awfully big adventure.", attribution: "Peter Pan" },
  { quote: "Madness, as you know, is a lot like gravity. All it takes is a little push.", attribution: "The Joker" },
  { quote: "Some things are better left buried. But not curiosity.", attribution: "Crypt Keeper Proverb" },
  { quote: "Even the darkest night will end and the sun will rise.", attribution: "Victor Hugo" },
  { quote: "The tomb, it seems, is not a dead end after all — merely a revolving door.", attribution: "Crypt Keeper Proverb" },
  { quote: "Everybody has a secret world inside of them. All of the people of the world, I mean everybody.", attribution: "Neil Gaiman" },
  { quote: "I have loved the stars too fondly to be fearful of the night.", attribution: "Sarah Williams" },
  { quote: "Listen to them, the children of the night. What music they make!", attribution: "Bram Stoker, Dracula" },
  { quote: "There is no exquisite beauty without some strangeness in the proportion.", attribution: "Edgar Allan Poe" },
];

const triviaInputSchema = {
  type: "object" as const,
  properties: {
    amount: {
      type: "number" as const,
      description: "Number of questions (default 3, max 10)",
    },
    difficulty: {
      type: "string" as const,
      description: "Difficulty: easy, medium, or hard",
    },
  },
  required: [] as string[],
};

const riddleInputSchema = {
  type: "object" as const,
  properties: {
    count: {
      type: "number" as const,
      description: "Number of riddles (default 1, max 5)",
    },
  },
  required: [] as string[],
};

const emptyInputSchema = {
  type: "object" as const,
  properties: {},
  required: [] as string[],
};

const pollInputSchema = {
  type: "object" as const,
  properties: {
    question: { type: "string" as const, description: "The poll question" },
    options: {
      type: "array" as const,
      items: { type: "string" as const },
      description: "Array of 2-10 options to vote on",
    },
  },
  required: ["question", "options"] as string[],
};

export function getBuiltinTools(ctx?: { sessionId?: string }): ToolSet {
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

  tools.get_trivia = {
    description:
      "Fetch trivia questions from the great beyond. Use when the user wants trivia, a quiz, or to test their knowledge.",
    inputSchema: jsonSchema(triviaInputSchema),
    execute: async (input: { amount?: number; difficulty?: string; category?: number }) => {
      return getTrivia(
        Math.min(input.amount ?? 3, 10),
        input.difficulty,
        input.category
      );
    },
  } satisfies ToolSet[string];

  tools.get_riddle = {
    description:
      "Draw a riddle from the Keeper's personal collection. Use when the user wants a riddle or brain teaser. Present the riddle first, offer to reveal the answer later.",
    inputSchema: jsonSchema(riddleInputSchema),
    execute: async (input: { count?: number }) => {
      const count = Math.min(input.count ?? 1, 5);
      const shuffled = [...RIDDLES].sort(() => Math.random() - 0.5);
      return { riddles: shuffled.slice(0, count) };
    },
  } satisfies ToolSet[string];

  tools.get_dark_quote = {
    description:
      "Retrieve a darkly humorous quote from the Keeper's grimoire. Use when the user wants a quote, inspiration, or wisdom from the crypt.",
    inputSchema: jsonSchema(emptyInputSchema),
    execute: async () => {
      const quote = DARK_QUOTES[Math.floor(Math.random() * DARK_QUOTES.length)];
      return quote;
    },
  } satisfies ToolSet[string];

  if (ctx?.sessionId) {
    tools.create_poll = {
      description:
        "Create a poll for session participants to vote on. After creating the poll, you MUST include the exact token [poll:<pollId>] in your response text (where pollId is the UUID returned) so it renders as an interactive widget. Do not list the options in text — the widget handles that.",
      inputSchema: jsonSchema(pollInputSchema),
      execute: async (input: { question: string; options: string[] }) => {
        const [poll] = await db
          .insert(polls)
          .values({
            sessionId: ctx.sessionId!,
            question: input.question,
            options: input.options,
          })
          .returning();
        return { pollId: poll.id, question: poll.question, options: poll.options };
      },
    } satisfies ToolSet[string];
  }

  return tools;
}
