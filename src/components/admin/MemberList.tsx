"use client";

import { useState } from "react";
import { useMembers } from "@/hooks/useMembers";

export function MemberList() {
  const { members, isLoading, mutate } = useMembers();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Remove this team member?")) return;
    setDeletingId(id);

    await fetch(`/api/admin/members/${id}`, { method: "DELETE" });
    mutate();
    setDeletingId(null);
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <div
          key={member.id}
          className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-700"
        >
          <div>
            <p className="text-sm font-medium">
              {member.name ?? member.email}
            </p>
            <p className="text-xs text-zinc-500">{member.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                member.inviteStatus === "active"
                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
              }`}
            >
              {member.inviteStatus}
            </span>
            {member.role !== "admin" && (
              <button
                onClick={() => handleDelete(member.id)}
                disabled={deletingId === member.id}
                className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50 dark:text-red-400"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
