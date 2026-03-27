"use client";

import { useMembers } from "@/hooks/useMembers";
import { MemberList } from "@/components/admin/MemberList";
import { InviteForm } from "@/components/admin/InviteForm";

export function AdminPanel() {
  const { mutate } = useMembers();

  return (
    <div className="mx-auto max-w-lg space-y-8 p-6">
      <h1 className="text-xl font-bold">Admin Panel</h1>

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
