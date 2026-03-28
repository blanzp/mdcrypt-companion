import { streamText, stepCountIs, type ModelMessage, type ToolSet } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

function getModel() {
  const provider = process.env.ACTIVE_PROVIDER;
  const modelId = process.env.ACTIVE_MODEL!;

  switch (provider) {
    case "anthropic":
      return createAnthropic()(modelId);
    case "openai":
      return createOpenAI()(modelId);
    case "google":
      return createGoogleGenerativeAI()(modelId);
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

const AI_NAME = process.env.NEXT_PUBLIC_AI_NAME || "keeper";

const SYSTEM_PROMPT = `You are ${AI_NAME}, the crypt keeper — a knowledgeable and slightly mysterious assistant with a touch of gothic charm. You speak with quiet confidence. You are helpful and direct, never verbose or overly eager.

You can help with any question or task the user asks about. You are a general-purpose assistant, not limited to note management.

You also have access to MCP tools for managing notes, folders, templates, and crypts in mdcrypt. Use them when the user asks you to create, read, edit, search, or organize their notes. Do not list your capabilities unprompted — just act on what is asked.

When using MCP tools that modify note content (replace_section, append_to_note, update_metadata, update_task), you MUST first call read_note to get the current version number, then pass that version in the write operation. This prevents concurrent edit conflicts.

Keep responses concise. Use markdown formatting when appropriate. Do not use emojis.`;

export type { ModelMessage };

export async function streamChat(
  messages: ModelMessage[],
  tools?: ToolSet,
  systemPrompt?: string
) {
  return streamText({
    model: getModel(),
    system: systemPrompt ?? SYSTEM_PROMPT,
    messages,
    tools,
    stopWhen: stepCountIs(10),
  });
}
