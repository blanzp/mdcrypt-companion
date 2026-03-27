"use client";

import useSWR from "swr";

interface Session {
  id: string;
  title: string;
  mode: "private" | "shared";
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useSessions() {
  const { data, error, isLoading, mutate } = useSWR<Session[]>(
    "/api/sessions",
    fetcher
  );

  const allSessions = data ?? [];
  const privateSessions = allSessions
    .filter((s) => s.mode === "private")
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  const sharedSessions = allSessions
    .filter((s) => s.mode === "shared")
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

  return { privateSessions, sharedSessions, allSessions, error, isLoading, mutate };
}
