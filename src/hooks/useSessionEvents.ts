"use client";

import { useEffect, useRef } from "react";
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

  useEffect(() => {
    if (!sessionId || mode !== "shared") return;

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
            // Avoid duplicates
            if (prev.some((m) => m.id === message.id)) return prev;
            return [...prev, message];
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
      setTimeout(() => {
        if (eventSourceRef.current === eventSource) {
          eventSourceRef.current = null;
        }
      }, 3000);
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [sessionId, mode, mutate]);
}
