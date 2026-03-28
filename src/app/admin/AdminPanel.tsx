"use client";

import { useMembers } from "@/hooks/useMembers";
import { MemberList } from "@/components/admin/MemberList";
import { InviteForm } from "@/components/admin/InviteForm";

export function AdminPanel() {
  const { mutate } = useMembers();

  return (
    <div className="mx-auto max-w-lg space-y-8 p-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Go back"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-xl font-bold">Admin Panel</h1>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Invite Member
        </h2>
        <InviteForm onInvited={() => mutate()} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Team Members
        </h2>
        <MemberList />
      </section>
    </div>
  );
}
