"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/app-store";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const AI_NAME = process.env.NEXT_PUBLIC_AI_NAME || "keeper";

export function McpKeyForm() {
  const { data: session } = useSession();
  const [apiKey, setApiKey] = useState("");
  const [sharedApiKey, setSharedApiKey] = useState("");
  const [cryptId, setCryptId] = useState("");
  const [sharedCryptId, setSharedCryptId] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [hasSharedKey, setHasSharedKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showSharedKey, setShowSharedKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings/mcp")
      .then((r) => r.json())
      .then((data) => {
        setHasKey(data.hasKey);
        setHasSharedKey(data.hasSharedKey);
        setCryptId(data.cryptId ?? "");
        setSharedCryptId(data.sharedCryptId ?? "");
      })
      .catch(() => {});
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);

    const res = await fetch("/api/settings/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: apiKey || undefined,
        sharedApiKey: sharedApiKey || undefined,
        cryptId,
        sharedCryptId,
      }),
    });

    if (res.ok) {
      setSaved(true);
      setHasKey(!!apiKey || hasKey);
      setHasSharedKey(!!sharedApiKey || hasSharedKey);
      setApiKey("");
      setSharedApiKey("");
      setTimeout(() => setSaved(false), 3000);
    }

    setLoading(false);
  }

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

      {/* MCP settings */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          mdcrypt
        </h2>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              API Key {hasKey && "(currently set)"}
            </label>
            <div className="flex gap-2">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={hasKey ? "Enter new key to update" : "Enter API key"}
                className="flex-1 min-h-[44px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="rounded-lg border border-zinc-200 px-3 text-xs dark:border-zinc-700"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Shared Sessions API Key {hasSharedKey && "(currently set)"}
            </label>
            <p className="mb-2 text-xs text-zinc-500">
              Optional. Uses a separate crypt for shared sessions. Falls back to your personal key if not set.
            </p>
            <div className="flex gap-2">
              <input
                type={showSharedKey ? "text" : "password"}
                value={sharedApiKey}
                onChange={(e) => setSharedApiKey(e.target.value)}
                placeholder={hasSharedKey ? "Enter new key to update" : "Enter API key"}
                className="flex-1 min-h-[44px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
              <button
                type="button"
                onClick={() => setShowSharedKey(!showSharedKey)}
                className="rounded-lg border border-zinc-200 px-3 text-xs dark:border-zinc-700"
              >
                {showSharedKey ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <Input
            label="Crypt ID"
            value={cryptId}
            onChange={(e) => setCryptId(e.target.value)}
            placeholder="Your mdcrypt crypt ID"
          />

          <Input
            label="Shared Sessions Crypt ID"
            value={sharedCryptId}
            onChange={(e) => setSharedCryptId(e.target.value)}
            placeholder="Optional — falls back to personal crypt ID"
          />

          <Button type="submit" loading={loading} size="lg" className="w-full">
            {saved ? "Saved!" : "Save"}
          </Button>
        </form>
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
