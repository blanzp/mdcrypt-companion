"use client";

import { useState, useRef } from "react";
import { useAppStore } from "@/stores/app-store";

interface Session {
  id: string;
  title: string;
  mode: "private" | "shared";
  ownerId: string;
}

interface SessionListProps {
  title: string;
  sessions: Session[];
  userId: string;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export function SessionList({
  title,
  sessions,
  userId,
  onSelect,
  onRename,
  onDelete,
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
            <div
              className={`flex min-h-[44px] w-full items-center px-4 text-left text-sm transition-colors ${
                activeSessionId === s.id
                  ? "bg-zinc-100 font-medium dark:bg-zinc-800"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <button
                className="flex-1 truncate text-left"
                onClick={() => onSelect(s.id)}
                onPointerDown={() => handleLongPress(s)}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              >
                {s.title}
              </button>
              {s.ownerId === userId && (
                <button
                  onClick={() => {
                    if (confirm("Delete this session?")) {
                      onDelete(s.id);
                    }
                  }}
                  className="ml-2 shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-red-500 dark:hover:bg-zinc-700 dark:hover:text-red-400"
                  aria-label="Delete session"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
