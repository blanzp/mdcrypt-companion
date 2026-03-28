"use client";

import { Avatar } from "@/components/ui/Avatar";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { CopyButton } from "./CopyButton";

const AI_NAME = process.env.NEXT_PUBLIC_AI_NAME || "keeper";

interface MessageBubbleProps {
  content: string;
  role: "user" | "assistant";
  isCurrentUser: boolean;
  senderName: string | null;
  showAvatar: boolean;
  createdAt: string;
}

export function MessageBubble({
  content,
  role,
  isCurrentUser,
  senderName,
  showAvatar,
  createdAt,
}: MessageBubbleProps) {
  const isUser = isCurrentUser;
  const time = new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isUser) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-blue-500 px-4 py-2.5 text-sm text-white">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
        <span className="px-1 text-[10px] text-zinc-400">{time}</span>
      </div>
    );
  }

  // Assistant or other participant
  return (
    <div className="flex gap-2">
      {showAvatar && (
        <Avatar
          name={role === "assistant" ? "AI" : senderName}
          size="sm"
          className="mt-1"
        />
      )}
      {!showAvatar && <div className="w-8 shrink-0" />}
      <div className="flex max-w-[80%] flex-col gap-0.5">
        {showAvatar && role === "assistant" && (
          <span className="text-xs font-medium text-purple-500">
            {AI_NAME}
          </span>
        )}
        {showAvatar && senderName && role !== "assistant" && (
          <span className="text-xs font-medium text-zinc-500">
            {senderName}
          </span>
        )}
        <div className="group relative rounded-2xl rounded-bl-md bg-zinc-100 px-4 py-2.5 dark:bg-zinc-800">
          {role === "assistant" ? (
            <>
              <MarkdownRenderer content={content} />
              <div className="absolute -top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                <CopyButton text={content} />
              </div>
            </>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{content}</p>
          )}
        </div>
        <span className="px-1 text-[10px] text-zinc-400">{time}</span>
      </div>
    </div>
  );
}
