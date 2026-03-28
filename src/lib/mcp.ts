import { createMCPClient } from "@ai-sdk/mcp";

const MCP_BASE_URL = "https://mdcrypt.dev/mcp";

export async function getMcpTools(apiKey: string, cryptId?: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };
  if (cryptId) {
    headers["X-Crypt-Id"] = cryptId;
  }

  const client = await createMCPClient({
    transport: {
      type: "http",
      url: cryptId ? `${MCP_BASE_URL}?crypt_id=${encodeURIComponent(cryptId)}` : MCP_BASE_URL,
      headers,
    },
  });

  const tools = await client.tools();

  return { tools, close: () => client.close() };
}
