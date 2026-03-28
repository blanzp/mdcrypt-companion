"use client";

import { useEffect, useRef, useCallback } from "react";
import useSWR from "swr";

interface Message {
  id: string;
  senderId: string | null;
  senderName: string | null;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export function useSessionEvents(
  sessionId: string | null,
  mode: "private" | "shared" | null
) {
  const { mutate } = useSWR<Message[]>(
    sessionId ? `/api/sessions/${sessionId}/messages` : null
  );
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!sessionId || mode !== "shared") return;

    // Clean up any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(
      `/api/sessions/${sessionId}/events`
    );
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as Message;
        mutate(
          (prev) => {
            if (!prev) return prev;
            // Avoid duplicates — match by id, also replace temp optimistic messages
            const withoutTemp = prev.filter(
              (m) => m.id !== message.id && !(m.id.startsWith("temp-") && m.content === message.content && m.role === message.role)
            );
            return [...withoutTemp, message];
          },
          { revalidate: false }
        );
      } catch {
        // Ignore parse errors
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      // Reconnect after 3 seconds
      reconnectTimer.current = setTimeout(() => {
        connect();
      }, 3000);
    };
  }, [sessionId, mode, mutate]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };
  }, [connect]);
}
