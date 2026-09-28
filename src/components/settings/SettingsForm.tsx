"use client";

import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/app-store";
import { Input } from "@/components/ui/Input";
import { BrainConnection, type BrainResult } from "./BrainConnection";

const AI_NAME = process.env.NEXT_PUBLIC_AI_NAME || "keeper";

export function SettingsForm({ brainResult }: { brainResult?: BrainResult }) {
  const { data: session } = useSession();
  const keeperContextCount = useAppStore((s) => s.keeperContextCount);
  const setKeeperContextCount = useAppStore((s) => s.setKeeperContextCount);

  return (
    <div className="space-y-6">
      {/* Profile (read-only) */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Profile
        </h2>
        <div className="space-y-2">
          <Input label="Name" value={session?.user?.name ?? ""} disabled />
          <Input label="Email" value={session?.user?.email ?? ""} disabled />
        </div>
      </section>

      {/* Second brain */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Second brain
        </h2>
        <BrainConnection result={brainResult} />
      </section>

      {/* Chat settings */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Chat
        </h2>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Context messages for @{AI_NAME}
          </label>
          <p className="mb-2 text-xs text-zinc-500">
            Number of recent messages included when summoning @{AI_NAME} in shared sessions.
          </p>
          <input
            type="number"
            min={1}
            max={100}
            value={keeperContextCount}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (!isNaN(n) && n >= 1 && n <= 100) {
                setKeeperContextCount(n);
              }
            }}
            className="min-h-[44px] w-24 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
      </section>

      {/* About */}
      <section className="space-y-1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          About
        </h2>
        <p className="text-sm text-zinc-500">mdcrypt keeper v0.1.0</p>
      </section>
    </div>
  );
}
