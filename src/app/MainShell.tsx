"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/app-store";
import { useSessions } from "@/hooks/useSessions";
import { Drawer } from "@/components/drawer/Drawer";
import { ChatView } from "@/components/chat/ChatView";
import { NewSessionModal } from "@/components/session/NewSessionModal";
import { AddMemberModal } from "@/components/session/AddMemberModal";

export function MainShell() {
  const { data: authSession } = useSession();
  const { activeSessionId, setDrawerOpen, toggleDrawer, setAddMemberModalOpen } = useAppStore();
  const { allSessions } = useSessions();
  const activeSession = allSessions.find((s) => s.id === activeSessionId);
  const touchStartX = useRef<number | null>(null);

  // Swipe from left edge to open drawer
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches[0].clientX < 20) {
      touchStartX.current = e.touches[0].clientX;
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (touchStartX.current !== null) {
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        if (deltaX > 50) {
          setDrawerOpen(true);
        }
        touchStartX.current = null;
      }
    },
    [setDrawerOpen]
  );

  useEffect(() => {
    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Header */}
      <header
        className="flex h-12 shrink-0 items-center border-b border-zinc-200 px-4 dark:border-zinc-700"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <button
          onClick={toggleDrawer}
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Open menu"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>
        <h1 className="ml-2 flex-1 truncate text-sm font-medium">
          {activeSession?.title ?? "mdcrypt keeper"}
        </h1>
        {activeSession?.mode === "shared" &&
          activeSession.ownerId === authSession?.user?.id && (
            <button
              onClick={() => setAddMemberModalOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Add member"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-5.25-4.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z"
                />
              </svg>
            </button>
          )}
      </header>

      {/* Chat */}
      <ChatView />

      {/* Drawer */}
      <Drawer />

      {/* FAB + Modal */}
      <NewSessionModal />
      <AddMemberModal />
    </div>
  );
}
