"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ToolCall {
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
}

interface AppState {
  // Session
  activeSessionId: string | null;
  setActiveSession: (id: string | null) => void;

  // Drawer
  drawerOpen: boolean;
  toggleDrawer: () => void;
  setDrawerOpen: (open: boolean) => void;

  // New session modal
  newSessionModalOpen: boolean;
  setNewSessionModalOpen: (open: boolean) => void;

  // Streaming
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  streamingMessage: string;
  setStreamingMessage: (msg: string) => void;
  appendToStreamingMessage: (delta: string) => void;

  // Tool calls
  toolCalls: ToolCall[];
  addToolCall: (tc: Omit<ToolCall, "result">) => void;
  updateToolCallResult: (toolName: string, result: unknown) => void;
  clearToolCalls: () => void;

  // Reset streaming state
  resetStreaming: () => void;

  // @keeper settings
  keeperContextCount: number;
  setKeeperContextCount: (n: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeSessionId: null,
      setActiveSession: (id) => set({ activeSessionId: id }),

      drawerOpen: false,
      toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
      setDrawerOpen: (open) => set({ drawerOpen: open }),

      newSessionModalOpen: false,
      setNewSessionModalOpen: (open) => set({ newSessionModalOpen: open }),

      isStreaming: false,
      setIsStreaming: (streaming) => set({ isStreaming: streaming }),
      streamingMessage: "",
      setStreamingMessage: (msg) => set({ streamingMessage: msg }),
      appendToStreamingMessage: (delta) =>
        set((s) => ({ streamingMessage: s.streamingMessage + delta })),

      toolCalls: [],
      addToolCall: (tc) =>
        set((s) => ({ toolCalls: [...s.toolCalls, { ...tc }] })),
      updateToolCallResult: (toolName, result) =>
        set((s) => ({
          toolCalls: s.toolCalls.map((tc) =>
            tc.toolName === toolName && !tc.result ? { ...tc, result } : tc
          ),
        })),
      clearToolCalls: () => set({ toolCalls: [] }),

      resetStreaming: () =>
        set({
          isStreaming: false,
          streamingMessage: "",
          toolCalls: [],
        }),

      keeperContextCount: 10,
      setKeeperContextCount: (n) => set({ keeperContextCount: n }),
    }),
    {
      name: "mdcrypt-companion",
      partialize: (state) => ({
        keeperContextCount: state.keeperContextCount,
      }),
    }
  )
);
