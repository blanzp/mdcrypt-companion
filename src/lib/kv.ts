import { kv } from "@vercel/kv";

interface KvMessage {
  id: string;
  senderId: string | null;
  senderName: string | null;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export async function publishMessage(sessionId: string, message: KvMessage) {
  await kv.zadd(`session:${sessionId}:messages`, {
    score: Date.now(),
    member: JSON.stringify(message),
  });
  // Auto-expire after 24 hours
  await kv.expire(`session:${sessionId}:messages`, 86400);
}

export async function getMessagesSince(
  sessionId: string,
  since: number
): Promise<KvMessage[]> {
  const results = await kv.zrange(
    `session:${sessionId}:messages`,
    since + 1,
    "+inf",
    { byScore: true }
  );
  return (results as string[]).map((m) =>
    typeof m === "string" ? JSON.parse(m) : m
  ) as KvMessage[];
}
