import { createMCPClient } from "@ai-sdk/mcp";

const MCP_BASE_URL = "https://mdcrypt.dev/mcp";

export async function getMcpTools(apiKey: string) {
  const client = await createMCPClient({
    transport: {
      type: "http",
      url: MCP_BASE_URL,
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    },
  });

  const tools = await client.tools();

  return { tools, close: () => client.close() };
}
