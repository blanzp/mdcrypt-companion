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

const SYSTEM_PROMPT = `You are a helpful AI assistant in mdcrypt keeper, a team chat application.

When using MCP tools that modify note content (replace_section, append_to_note, update_metadata, update_task), you MUST first call read_note to get the current version number, then pass that version in the write operation. This prevents concurrent edit conflicts.

Be concise and helpful. Format responses using markdown when appropriate.`;

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
