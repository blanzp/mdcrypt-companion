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

export function getBuiltinTools(): ToolSet {
  const tools: ToolSet = {};

  if (BRAVE_API_KEY) {
    tools.web_search = {
      description:
        "Search the web using Brave Search. Use this when the user asks about current events, needs up-to-date information, or asks you to look something up online.",
      inputSchema: jsonSchema(searchInputSchema),
      execute: async (input: { query: string; count?: number }) => {
        return braveSearch(input.query, input.count ?? 5);
      },
    } satisfies ToolSet[string];
  }

  return tools;
}
