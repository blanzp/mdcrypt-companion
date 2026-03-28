"use client";

import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { MemberSelect } from "./MemberSelect";

export function AddMemberModal() {
  const { activeSessionId, addMemberModalOpen, setAddMemberModalOpen } =
    useAppStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleInvite() {
    if (!activeSessionId || selectedIds.length === 0) return;
    setLoading(true);

    const res = await fetch(`/api/sessions/${activeSessionId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: selectedIds }),
    });

    if (res.ok) {
      setAddMemberModalOpen(false);
      setSelectedIds([]);
    }

    setLoading(false);
  }

  return (
    <Modal
      open={addMemberModalOpen}
      onClose={() => {
        setAddMemberModalOpen(false);
        setSelectedIds([]);
      }}
      title="Add Members"
    >
      <div className="space-y-4">
        <MemberSelect selected={selectedIds} onChange={setSelectedIds} />
        <Button
          onClick={handleInvite}
          loading={loading}
          disabled={selectedIds.length === 0}
          className="w-full"
          size="lg"
        >
          Add to Session
        </Button>
      </div>
    </Modal>
  );
}
