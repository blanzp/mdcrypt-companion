"use client";

import { useState, useRef } from "react";
import { useAppStore } from "@/stores/app-store";

interface Session {
  id: string;
  title: string;
  mode: "private" | "shared";
}

interface SessionListProps {
  title: string;
  sessions: Session[];
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

export function SessionList({
  title,
  sessions,
  onSelect,
  onRename,
}: SessionListProps) {
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleLongPress(session: Session) {
    longPressTimer.current = setTimeout(() => {
      setEditingId(session.id);
      setEditValue(session.title);
      setTimeout(() => inputRef.current?.focus(), 50);
    }, 500);
  }

  function handlePointerUp() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  }

  function handleRenameSubmit(id: string) {
    if (editValue.trim()) {
      onRename(id, editValue.trim());
    }
    setEditingId(null);
  }

  if (sessions.length === 0) return null;

  return (
    <div className="py-2">
      <p className="px-4 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {title}
      </p>
      {sessions.map((s) => (
        <div key={s.id}>
          {editingId === s.id ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => handleRenameSubmit(s.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameSubmit(s.id);
                if (e.key === "Escape") setEditingId(null);
              }}
              className="mx-2 w-[calc(100%-1rem)] rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            />
          ) : (
            <button
              className={`flex min-h-[44px] w-full items-center px-4 text-left text-sm transition-colors ${
                activeSessionId === s.id
                  ? "bg-zinc-100 font-medium dark:bg-zinc-800"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
              onClick={() => onSelect(s.id)}
              onPointerDown={() => handleLongPress(s)}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              <span className="truncate">{s.title}</span>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
