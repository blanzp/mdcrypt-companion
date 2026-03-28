import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { eq, asc, and, desc } from "drizzle-orm";
import { type ModelMessage } from "@/lib/llm";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  sessions,
  sessionParticipants,
  messages,
  users,
} from "@/lib/db/schema";
import { streamChat } from "@/lib/llm";
import { getMcpTools } from "@/lib/mcp";
import { decrypt } from "@/lib/crypto";
import { publishMessage } from "@/lib/kv";

const AI_NAME = process.env.NEXT_PUBLIC_AI_NAME || "keeper";
const KEEPER_MENTION = new RegExp(`@${AI_NAME}\\b`, "i");

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    sessionId,
    message,
    summon = false,
    contextMessageCount = 10,
  } = await req.json();

  if (!sessionId || !message) {
    return NextResponse.json(
      { error: "sessionId and message are required" },
      { status: 400 }
    );
  }

  // Verify user is a participant
  const [participation] = await db
    .select()
    .from(sessionParticipants)
    .where(
      and(
        eq(sessionParticipants.sessionId, sessionId),
        eq(sessionParticipants.userId, session.user.id)
      )
    )
    .limit(1);

  if (!participation) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  // Load session
  const [chatSession] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!chatSession) {
    return NextResponse.json(
      { error: "Session not found" },
      { status: 404 }
    );
  }

  const isShared = chatSession.mode === "shared";

  // Shared session without @keeper summon: persist + broadcast only
  if (isShared && !summon) {
    const [userMsg] = await db
      .insert(messages)
      .values({
        sessionId,
        senderId: session.user.id,
        role: "user",
        content: message,
      })
      .returning();

    await db
      .update(sessions)
      .set({ updatedAt: new Date() })
      .where(eq(sessions.id, sessionId));

    await publishMessage(sessionId, {
      id: userMsg.id,
      senderId: session.user.id,
      senderName: session.user.name,
      role: "user",
      content: message,
      createdAt: userMsg.createdAt.toISOString(),
    });

    return new Response(null, { status: 204 });
  }

  // Load message history — shared sessions get last N, private gets all
  let history: { role: string; content: string }[];

  if (isShared) {
    // Last N messages (descending then reverse) for shared @keeper context
    const count = Math.max(1, Math.min(contextMessageCount, 100));
    const recent = await db
      .select({ role: messages.role, content: messages.content })
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(desc(messages.createdAt))
      .limit(count);
    history = recent.reverse();
  } else {
    // Full history for private sessions
    history = await db
      .select({ role: messages.role, content: messages.content })
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(asc(messages.createdAt));
  }

  // Strip @keeper from the message before sending to LLM
  const llmMessage = isShared
    ? message.replace(KEEPER_MENTION, "").trim()
    : message;

  const coreMessages: ModelMessage[] = [
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: llmMessage },
  ];

  // Resolve MCP credentials
  let mcpTools: Awaited<ReturnType<typeof getMcpTools>> | undefined;
  const mcpOwnerId = isShared ? chatSession.ownerId : session.user.id;

  const [mcpOwner] = await db
    .select({
      mcpApiKey: users.mcpApiKey,
      mcpSharedApiKey: users.mcpSharedApiKey,
      mcpCryptId: users.mcpCryptId,
      mcpSharedCryptId: users.mcpSharedCryptId,
    })
    .from(users)
    .where(eq(users.id, mcpOwnerId))
    .limit(1);

  const encryptedKey = isShared
    ? (mcpOwner?.mcpSharedApiKey ?? mcpOwner?.mcpApiKey)
    : mcpOwner?.mcpApiKey;
  const cryptId = isShared
    ? (mcpOwner?.mcpSharedCryptId ?? mcpOwner?.mcpCryptId)
    : mcpOwner?.mcpCryptId;

  if (encryptedKey) {
    try {
      const apiKey = decrypt(encryptedKey);
      mcpTools = await getMcpTools(apiKey, cryptId ?? undefined);
    } catch {
      // Decryption failed or MCP server unreachable — silently disable MCP
    }
  }

  // Stream LLM response
  const result = await streamChat(coreMessages, mcpTools?.tools);

  // Create SSE response
  const encoder = new TextEncoder();
  let fullResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const part of result.fullStream) {
          if (part.type === "text-delta") {
            fullResponse += part.text;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "text-delta", content: part.text })}\n\n`
              )
            );
          } else if (part.type === "tool-call") {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "tool-call", toolName: part.toolName, args: part.input })}\n\n`
              )
            );
          } else if (part.type === "tool-result") {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "tool-result", toolName: part.toolName, result: part.output })}\n\n`
              )
            );
          }
        }

        // Send finish event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "finish", content: fullResponse })}\n\n`
          )
        );

        // Persist messages
        const [userMsg] = await db
          .insert(messages)
          .values({
            sessionId,
            senderId: session.user.id,
            role: "user",
            content: message,
          })
          .returning();

        const [assistantMsg] = await db
          .insert(messages)
          .values({
            sessionId,
            senderId: null,
            role: "assistant",
            content: fullResponse,
          })
          .returning();

        // Update session timestamp
        await db
          .update(sessions)
          .set({ updatedAt: new Date() })
          .where(eq(sessions.id, sessionId));

        // Publish to KV for shared sessions
        if (isShared) {
          await publishMessage(sessionId, {
            id: userMsg.id,
            senderId: session.user.id,
            senderName: session.user.name,
            role: "user",
            content: message,
            createdAt: userMsg.createdAt.toISOString(),
          });
          await publishMessage(sessionId, {
            id: assistantMsg.id,
            senderId: null,
            senderName: null,
            role: "assistant",
            content: fullResponse,
            createdAt: assistantMsg.createdAt.toISOString(),
          });
        }

        controller.close();
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: String(error) })}\n\n`
          )
        );
        controller.close();
      } finally {
        await mcpTools?.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
