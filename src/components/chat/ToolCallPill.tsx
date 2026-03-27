"use client";

import { useState } from "react";

interface ToolCallPillProps {
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
}

const TOOL_LABELS: Record<string, string> = {
  list_notes: "Listed notes",
  read_note: "Read note",
  create_note: "Created note",
  replace_section: "Updated section",
  append_to_note: "Appended to note",
  update_metadata: "Updated metadata",
  update_task: "Updated task",
  delete_note: "Deleted note",
  restore_note: "Restored note",
  move_note: "Moved note",
  get_backlinks: "Found backlinks",
  list_folders: "Listed folders",
  create_folder: "Created folder",
  delete_folder: "Deleted folder",
  list_crypts: "Listed crypts",
  list_templates: "Listed templates",
  create_template: "Created template",
  read_template: "Read template",
  update_template: "Updated template",
  delete_template: "Deleted template",
};

export function ToolCallPill({ toolName, args, result }: ToolCallPillProps) {
  const [expanded, setExpanded] = useState(false);
  const label = TOOL_LABELS[toolName] ?? toolName;

  return (
    <div className="my-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
      >
        <span>🔧</span>
        <span>{label}</span>
        {result !== undefined && <span>·</span>}
        {result !== undefined && (
          <span className="text-green-600 dark:text-green-400">done</span>
        )}
      </button>

      {expanded && (
        <div className="mt-1 rounded-lg bg-zinc-50 p-3 text-xs dark:bg-zinc-800/50">
          <p className="font-medium text-zinc-500">Tool: {toolName}</p>
          <p className="mt-1 font-medium text-zinc-500">Parameters:</p>
          <pre className="mt-0.5 overflow-x-auto text-zinc-600 dark:text-zinc-400">
            {JSON.stringify(args, null, 2)}
          </pre>
          {result !== undefined && (
            <>
              <p className="mt-2 font-medium text-zinc-500">Result:</p>
              <pre className="mt-0.5 overflow-x-auto text-zinc-600 dark:text-zinc-400">
                {JSON.stringify(result, null, 2)}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
