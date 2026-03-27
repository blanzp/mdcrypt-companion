"use client";

import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { useSessions } from "@/hooks/useSessions";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { MemberSelect } from "./MemberSelect";

export function NewSessionModal() {
  const { newSessionModalOpen, setNewSessionModalOpen, setActiveSession } =
    useAppStore();
  const { mutate } = useSessions();

  const [mode, setMode] = useState<"private" | "shared">("private");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        participantIds: mode === "shared" ? participantIds : [],
      }),
    });

    if (res.ok) {
      const session = await res.json();
      mutate();
      setActiveSession(session.id);
      setNewSessionModalOpen(false);
      setMode("private");
      setParticipantIds([]);
    }

    setLoading(false);
  }

  return (
    <Modal
      open={newSessionModalOpen}
      onClose={() => setNewSessionModalOpen(false)}
      title="New Session"
    >
      <div className="space-y-4">
        {/* Mode toggle */}
        <div className="flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
          <button
            onClick={() => setMode("private")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === "private"
                ? "bg-white shadow dark:bg-zinc-700"
                : "text-zinc-500"
            }`}
          >
            Private
          </button>
          <button
            onClick={() => setMode("shared")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === "shared"
                ? "bg-white shadow dark:bg-zinc-700"
                : "text-zinc-500"
            }`}
          >
            Shared
          </button>
        </div>

        {/* Member select for shared */}
        {mode === "shared" && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Invite members</p>
            <MemberSelect
              selected={participantIds}
              onChange={setParticipantIds}
            />
          </div>
        )}

        <Button
          onClick={handleCreate}
          loading={loading}
          className="w-full"
          size="lg"
        >
          Create Session
        </Button>
      </div>
    </Modal>
  );
}
