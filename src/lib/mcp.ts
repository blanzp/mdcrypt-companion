import { tool } from "ai";
import { z } from "zod";

const MCP_BASE_URL = "https://mdcrypt.dev/mcp";

async function mcpRequest(
  toolName: string,
  params: Record<string, unknown>,
  apiKey: string,
  cryptId: string
): Promise<unknown> {
  const res = await fetch(`${MCP_BASE_URL}/tools/${toolName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...params, crypt_id: cryptId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MCP ${toolName} failed (${res.status}): ${text}`);
  }

  return res.json();
}

export function createMcpTools(apiKey: string, cryptId: string) {
  const call = (name: string, params: Record<string, unknown>) =>
    mcpRequest(name, params, apiKey, cryptId);

  return {
    // === Notes ===
    list_notes: tool({
      description: "Search/filter notes by folder, tag, or query",
      inputSchema: z.object({
        query: z.string().optional(),
        folder: z.string().optional(),
        tag: z.string().optional(),
      }),
      execute: async (input) => call("list_notes", input),
    }),

    read_note: tool({
      description:
        "Get full content + frontmatter of a note by UUID. Returns the version number needed for write operations.",
      inputSchema: z.object({
        note_id: z.string().describe("UUID of the note"),
      }),
      execute: async (input) => call("read_note", input),
    }),

    create_note: tool({
      description:
        "Create a new note with optional template, tags, folder, and diagram support",
      inputSchema: z.object({
        title: z.string(),
        content: z.string().optional(),
        folder: z.string().optional(),
        tags: z.array(z.string()).optional(),
        template_id: z.string().optional(),
      }),
      execute: async (input) => call("create_note", input),
    }),

    replace_section: tool({
      description:
        "Surgical section replacement by heading. Requires version from read_note.",
      inputSchema: z.object({
        note_id: z.string(),
        heading: z.string().describe("The heading of the section to replace"),
        content: z.string().describe("New content for the section"),
        version: z.number().describe("Current version from read_note"),
      }),
      execute: async (input) => call("replace_section", input),
    }),

    append_to_note: tool({
      description:
        "Add content to the end of a note. Requires version from read_note.",
      inputSchema: z.object({
        note_id: z.string(),
        content: z.string(),
        version: z.number().describe("Current version from read_note"),
      }),
      execute: async (input) => call("append_to_note", input),
    }),

    update_metadata: tool({
      description:
        "Change title, tags, or status without touching body. Requires version from read_note.",
      inputSchema: z.object({
        note_id: z.string(),
        title: z.string().optional(),
        tags: z.array(z.string()).optional(),
        status: z.string().optional(),
        version: z.number().describe("Current version from read_note"),
      }),
      execute: async (input) => call("update_metadata", input),
    }),

    update_task: tool({
      description:
        "Check/uncheck GFM task list items. Requires version from read_note.",
      inputSchema: z.object({
        note_id: z.string(),
        task_index: z.number().describe("Zero-based index of the task"),
        checked: z.boolean(),
        version: z.number().describe("Current version from read_note"),
      }),
      execute: async (input) => call("update_task", input),
    }),

    delete_note: tool({
      description: "Soft delete a note (recoverable)",
      inputSchema: z.object({
        note_id: z.string(),
      }),
      execute: async (input) => call("delete_note", input),
    }),

    restore_note: tool({
      description: "Undo a soft delete",
      inputSchema: z.object({
        note_id: z.string(),
      }),
      execute: async (input) => call("restore_note", input),
    }),

    move_note: tool({
      description: "Move a note to a different folder",
      inputSchema: z.object({
        note_id: z.string(),
        folder: z.string().describe("Target folder path"),
      }),
      execute: async (input) => call("move_note", input),
    }),

    get_backlinks: tool({
      description:
        "Find all notes linking to a given note via [[wiki links]]",
      inputSchema: z.object({
        note_id: z.string(),
      }),
      execute: async (input) => call("get_backlinks", input),
    }),

    // === Folders ===
    list_folders: tool({
      description: "List all folders in the crypt",
      inputSchema: z.object({}),
      execute: async (input) => call("list_folders", input),
    }),

    create_folder: tool({
      description: "Create a new folder",
      inputSchema: z.object({
        name: z.string(),
        parent: z.string().optional().describe("Parent folder path"),
      }),
      execute: async (input) => call("create_folder", input),
    }),

    delete_folder: tool({
      description:
        "Delete a folder. Notes inside are moved to root, not deleted.",
      inputSchema: z.object({
        folder: z.string(),
      }),
      execute: async (input) => call("delete_folder", input),
    }),

    // === Crypts ===
    list_crypts: tool({
      description: "List available crypts for the authenticated user",
      inputSchema: z.object({}),
      execute: async (input) => call("list_crypts", input),
    }),

    // === Templates ===
    list_templates: tool({
      description: "List all templates",
      inputSchema: z.object({}),
      execute: async (input) => call("list_templates", input),
    }),

    create_template: tool({
      description: "Create a new template",
      inputSchema: z.object({
        name: z.string(),
        content: z.string(),
      }),
      execute: async (input) => call("create_template", input),
    }),

    read_template: tool({
      description: "Fetch a template by ID",
      inputSchema: z.object({
        template_id: z.string(),
      }),
      execute: async (input) => call("read_template", input),
    }),

    update_template: tool({
      description: "Update an existing template",
      inputSchema: z.object({
        template_id: z.string(),
        name: z.string().optional(),
        content: z.string().optional(),
      }),
      execute: async (input) => call("update_template", input),
    }),

    delete_template: tool({
      description: "Delete a template",
      inputSchema: z.object({
        template_id: z.string(),
      }),
      execute: async (input) => call("delete_template", input),
    }),
  };
}
