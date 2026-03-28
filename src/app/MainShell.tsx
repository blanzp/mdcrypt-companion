"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAppStore } from "@/stores/app-store";
import { useSessions } from "@/hooks/useSessions";
import { Drawer } from "@/components/drawer/Drawer";
import { ChatView } from "@/components/chat/ChatView";
import { NewSessionFAB } from "@/components/session/NewSessionFAB";
import { NewSessionModal } from "@/components/session/NewSessionModal";

export function MainShell() {
  const { activeSessionId, setDrawerOpen, toggleDrawer } = useAppStore();
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
    <div className="flex h-full flex-col">
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
        <h1 className="ml-2 truncate text-sm font-medium">
          {activeSession?.title ?? "mdcrypt keeper"}
        </h1>
      </header>

      {/* Chat */}
      <ChatView />

      {/* Drawer */}
      <Drawer />

      {/* FAB + Modal */}
      <NewSessionFAB />
      <NewSessionModal />
    </div>
  );
}
