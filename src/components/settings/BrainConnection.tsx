"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

type Status = { connected: false } | { connected: true; login: string; repo: string };
export type BrainResult = { result: string; detail?: string };

const MESSAGES: Record<string, string> = {
  connected: "Connected.",
  unreachable: "The second brain server can't be reached right now. Try again in a minute.",
};

export function BrainConnection({ result }: { result?: BrainResult }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [notice, setNotice] = useState(() =>
    result
      ? {
          text: MESSAGES[result.result] ?? `Couldn't connect: ${result.detail ?? "unknown error"}`,
          bad: result.result !== "connected",
        }
      : null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Drop ?brain=… so a reload doesn't repeat the message
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
    fetch("/api/brain/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ connected: false }));
  }, []);

  async function handleDisconnect() {
    setLoading(true);
    const res = await fetch("/api/brain/disconnect", { method: "POST" });
    if (res.ok) {
      setStatus({ connected: false });
      setNotice(null);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">
        Let the keeper search, read and write notes in your second brain. In shared sessions you start, others can ask
        the keeper to search and read it, but not change it.
      </p>

      {status === null ? (
        <p className="text-sm text-zinc-500">Checking…</p>
      ) : status.connected ? (
        <>
          <p className="text-sm">
            Connected as <span className="font-semibold">{status.login}</span> to{" "}
            <a
              href={`https://github.com/${status.repo}`}
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline"
            >
              {status.repo}
            </a>
          </p>
          <Button variant="secondary" size="lg" className="w-full" loading={loading} onClick={handleDisconnect}>
            Disconnect
          </Button>
        </>
      ) : (
        <Button size="lg" className="w-full" onClick={() => (window.location.href = "/api/brain/connect")}>
          Connect second brain
        </Button>
      )}

      {notice && (
        <p className={`text-sm ${notice.bad ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}>
          {notice.text}
        </p>
      )}
    </div>
  );
}
