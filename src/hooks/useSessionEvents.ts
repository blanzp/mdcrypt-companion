"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useSessionEvents(
  sessionId: string | null,
  mode: "private" | "shared" | null
) {
  // Poll for new messages every 2 seconds in shared sessions
  useSWR(
    sessionId && mode === "shared"
      ? `/api/sessions/${sessionId}/messages`
      : null,
    fetcher,
    { refreshInterval: 2000 }
  );
}
