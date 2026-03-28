"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  KeyboardEvent,
} from "react";

const AI_NAME = process.env.NEXT_PUBLIC_AI_NAME || "keeper";

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled: boolean;
  isShared: boolean;
  onFocus?: () => void;
  onNewSession?: () => void;
}

export function MessageInput({ onSend, disabled, isShared, onFocus, onNewSession }: MessageInputProps) {
  const [value, setValue] = useState("");
  const [showTypeahead, setShowTypeahead] = useState(false);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typeaheadRef = useRef<HTMLDivElement>(null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = 5 * 24; // ~5 lines
    el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
  }, []);

  // Close typeahead on click outside
  useEffect(() => {
    if (!showTypeahead) return;
    function handleClick(e: MouseEvent) {
      if (
        typeaheadRef.current &&
        !typeaheadRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowTypeahead(false);
        setMentionStart(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showTypeahead]);

  function handleChange(newValue: string) {
    setValue(newValue);
    resize();

    if (!isShared) return;

    const el = textareaRef.current;
    if (!el) return;

    const cursor = el.selectionStart;

    // Find if there's a @ that starts a mention at or before cursor
    const textBeforeCursor = newValue.slice(0, cursor);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex >= 0) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      // Show typeahead if text after @ is a prefix of the AI name
      if (AI_NAME.toLowerCase().startsWith(textAfterAt.toLowerCase())) {
        setShowTypeahead(true);
        setMentionStart(atIndex);
        return;
      }
    }

    setShowTypeahead(false);
    setMentionStart(null);
  }

  function acceptTypeahead() {
    if (mentionStart === null) return;

    const el = textareaRef.current;
    const cursor = el?.selectionStart ?? value.length;

    // Replace from @ to cursor with @name
    const before = value.slice(0, mentionStart);
    const after = value.slice(cursor);
    const newValue = `${before}@${AI_NAME} ${after}`;
    setValue(newValue);

    setShowTypeahead(false);
    setMentionStart(null);

    // Restore focus and cursor position
    requestAnimationFrame(() => {
      if (el) {
        el.focus();
        const pos = mentionStart + `@${AI_NAME} `.length;
        el.setSelectionRange(pos, pos);
      }
    });
  }

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    setShowTypeahead(false);
    setMentionStart(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (showTypeahead) {
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        acceptTypeahead();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowTypeahead(false);
        setMentionStart(null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div
      className="sticky bottom-0 border-t border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      {/* Typeahead popup */}
      {showTypeahead && (
        <div
          ref={typeaheadRef}
          className="mb-2 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
        >
          <button
            onClick={acceptTypeahead}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-500 text-xs font-medium text-white">
              CK
            </span>
            <div>
              <span className="font-medium">@{AI_NAME}</span>
              <span className="ml-2 text-xs text-zinc-500">
                Summon the AI
              </span>
            </div>
            <span className="ml-auto text-[10px] text-zinc-400">Tab</span>
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={onFocus}
          onKeyDown={handleKeyDown}
          placeholder={
            isShared ? `Message... (use @${AI_NAME} to summon AI)` : "Message..."
          }
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none focus:border-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-zinc-500"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white transition-colors hover:bg-blue-600 disabled:opacity-30"
          aria-label="Send message"
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
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
            />
          </svg>
        </button>
        {onNewSession && (
          <button
            onClick={onNewSession}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
            aria-label="New session"
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
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          </button>
        )}

      </div>
      {disabled && (
        <p className="mt-1 text-center text-xs text-zinc-400">
          AI is responding...
        </p>
      )}
    </div>
  );
}
