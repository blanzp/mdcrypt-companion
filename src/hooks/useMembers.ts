"use client";

import useSWR from "swr";

interface Member {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "member";
  inviteStatus: "pending" | "active";
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useMembers() {
  const { data, error, isLoading, mutate } = useSWR<Member[]>(
    "/api/admin/members",
    fetcher
  );

  return { members: data ?? [], error, isLoading, mutate };
}
