"use client";

import useSWR from "swr";
import { useAppStore } from "@/stores/app-store";

interface Message {
  id: string;
  sessionId: string;
  senderId: string | null;
  senderName: string | null;
  senderEmail: string | null;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const AI_NAME = process.env.NEXT_PUBLIC_AI_NAME || "keeper";
const KEEPER_RE = new RegExp(`@${AI_NAME}\\b`, "i");

export function useChat(
  sessionId: string | null,
  sessionMode: "private" | "shared" | null
) {
  const { data, mutate, isLoading } = useSWR<Message[]>(
    sessionId ? `/api/sessions/${sessionId}/messages` : null,
    fetcher
  );

  const {
    isStreaming,
    setIsStreaming,
    appendToStreamingMessage,
    addToolCall,
    updateToolCallResult,
    resetStreaming,
    keeperContextCount,
  } = useAppStore();

  async function sendMessage(content: string) {
    if (!sessionId || isStreaming) return;

    const isShared = sessionMode === "shared";
    const summon = isShared && KEEPER_RE.test(content);

    // Optimistically add user message
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      sessionId,
      senderId: "self",
      senderName: null,
      senderEmail: null,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    mutate((prev) => [...(prev ?? []), optimisticMsg], false);

    // Shared session without @keeper: just persist, no AI response
    if (isShared && !summon) {
      try {
        await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, message: content, summon: false }),
        });
        mutate();
      } catch (error) {
        console.error("Send message error:", error);
      }
      return;
    }

    // Private session or @keeper summon: stream AI response
    setIsStreaming(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: content,
          summon,
          contextMessageCount: isShared ? keeperContextCount : undefined,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to send message");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));

          switch (data.type) {
            case "text-delta":
              appendToStreamingMessage(data.content);
              break;
            case "tool-call":
              addToolCall({ toolName: data.toolName, args: data.args });
              break;
            case "tool-result":
              updateToolCallResult(data.toolName, data.result);
              break;
            case "finish":
              mutate();
              break;
            case "error":
              console.error("Chat error:", data.message);
              break;
          }
        }
      }
    } catch (error) {
      console.error("Send message error:", error);
    } finally {
      resetStreaming();
    }
  }

  return {
    messages: data ?? [],
    isLoading,
    sendMessage,
    mutate,
  };
}
