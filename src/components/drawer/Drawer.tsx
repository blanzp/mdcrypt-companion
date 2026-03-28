"use client";

import { useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";
import { useAppStore } from "@/stores/app-store";
import { useSessions } from "@/hooks/useSessions";
import { SessionList } from "./SessionList";
import { Avatar } from "@/components/ui/Avatar";
import Link from "next/link";

export function Drawer() {
  const { data: session } = useSession();
  const { drawerOpen, setDrawerOpen, activeSessionId, setActiveSession } = useAppStore();
  const { privateSessions, sharedSessions, mutate } = useSessions();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    if (drawerOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [drawerOpen, setDrawerOpen]);

  function handleSessionSelect(sessionId: string) {
    setActiveSession(sessionId);
    setDrawerOpen(false);
  }

  async function handleRename(sessionId: string, newTitle: string) {
    await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
    mutate();
  }

  async function handleDelete(sessionId: string) {
    const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
    if (res.ok) {
      if (activeSessionId === sessionId) {
        setActiveSession(null);
      }
      mutate();
    }
  }

  if (!session) return null;

  return (
    <>
      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed inset-y-0 left-0 z-50 flex w-[80vw] max-w-[320px] flex-col bg-white transition-transform duration-200 ease-out dark:bg-zinc-900 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {/* User Profile */}
        <div className="flex items-center gap-3 border-b border-zinc-200 p-4 dark:border-zinc-700">
          <Avatar name={session.user.name} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {session.user.name}
            </p>
            <p className="truncate text-xs text-zinc-500">
              {session.user.email}
            </p>
          </div>
        </div>

        {/* Session Lists */}
        <div className="flex-1 overflow-y-auto">
          <SessionList
            title="PRIVATE"
            sessions={privateSessions}
            userId={session.user.id}
            onSelect={handleSessionSelect}
            onRename={handleRename}
            onDelete={handleDelete}
          />
          <SessionList
            title="SHARED"
            sessions={sharedSessions}
            userId={session.user.id}
            onSelect={handleSessionSelect}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        </div>

        {/* Footer Links */}
        <div className="border-t border-zinc-200 dark:border-zinc-700">
          <Link
            href="/settings"
            onClick={() => setDrawerOpen(false)}
            className="flex min-h-[44px] items-center px-4 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Settings
          </Link>
          {session.user.role === "admin" && (
            <Link
              href="/admin"
              onClick={() => setDrawerOpen(false)}
              className="flex min-h-[44px] items-center px-4 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Admin Panel
            </Link>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex min-h-[44px] w-full items-center px-4 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
