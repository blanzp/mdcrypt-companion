"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useChat } from "@/hooks/useChat";
import { useSessionEvents } from "@/hooks/useSessionEvents";
import { useAppStore } from "@/stores/app-store";
import { useSessions } from "@/hooks/useSessions";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { ToolCallPill } from "./ToolCallPill";
import { MessageSkeleton } from "@/components/ui/Skeleton";
import { MarkdownRenderer } from "./MarkdownRenderer";

export function ChatView() {
  const { data: session } = useSession();
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const isStreaming = useAppStore((s) => s.isStreaming);
  const streamingMessage = useAppStore((s) => s.streamingMessage);
  const toolCalls = useAppStore((s) => s.toolCalls);

  const { allSessions } = useSessions();
  const activeSession = allSessions.find((s) => s.id === activeSessionId);

  const { messages, isLoading, sendMessage } = useChat(
    activeSessionId,
    activeSession?.mode ?? null,
    session?.user?.id
  );
  useSessionEvents(activeSessionId, activeSession?.mode ?? null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages or streaming
  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [messages, messages.length, streamingMessage, isStreaming]);

  const isShared = activeSession?.mode === "shared";

  if (!activeSessionId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-4xl">💬</div>
        <h2 className="text-lg font-medium">Start a conversation</h2>
        <p className="text-sm text-zinc-500">
          Create a new session using the + button
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <MessageSkeleton />;
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            content={msg.content}
            role={msg.role}
            isCurrentUser={msg.senderId === session?.user?.id}
            senderName={msg.senderName}
            showAvatar={isShared && (msg.role === "assistant" || msg.senderId !== session?.user?.id)}
            createdAt={msg.createdAt}
          />
        ))}

        {/* Tool calls during streaming */}
        {toolCalls.map((tc, i) => (
          <ToolCallPill
            key={`${tc.toolName}-${i}`}
            toolName={tc.toolName}
            args={tc.args}
            result={tc.result}
          />
        ))}

        {/* Streaming message */}
        {isStreaming && streamingMessage && (
          <div className="flex gap-2">
            {isShared && (
              <div className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full bg-purple-500 text-xs font-medium text-white mt-1">
                CK
              </div>
            )}
            <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-zinc-100 px-4 py-2.5 dark:bg-zinc-800">
              <MarkdownRenderer content={streamingMessage} />
            </div>
          </div>
        )}

        {/* Streaming indicator */}
        {isStreaming && !streamingMessage && (
          <div className="flex gap-2">
            <div className="rounded-2xl rounded-bl-md bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <MessageInput onSend={sendMessage} disabled={isStreaming} isShared={isShared} />
    </div>
  );
}
