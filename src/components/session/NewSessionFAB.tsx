"use client";

import { useAppStore } from "@/stores/app-store";

export function NewSessionFAB() {
  const setNewSessionModalOpen = useAppStore(
    (s) => s.setNewSessionModalOpen
  );

  return (
    <button
      onClick={() => setNewSessionModalOpen(true)}
      className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
      style={{
        bottom: "calc(1.5rem + env(safe-area-inset-bottom))",
      }}
      aria-label="New session"
    >
      <svg
        className="h-7 w-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 4.5v15m7.5-7.5h-15"
        />
      </svg>
    </button>
  );
}
