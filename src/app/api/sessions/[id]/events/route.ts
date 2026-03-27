import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sessionParticipants } from "@/lib/db/schema";
import { getMessagesSince } from "@/lib/kv";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify participation
  const [participation] = await db
    .select()
    .from(sessionParticipants)
    .where(
      and(
        eq(sessionParticipants.sessionId, id),
        eq(sessionParticipants.userId, session.user.id)
      )
    )
    .limit(1);

  if (!participation) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  const encoder = new TextEncoder();
  let lastTimestamp = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const abortSignal = req.signal;
      let heartbeatCount = 0;

      const poll = async () => {
        if (abortSignal.aborted) {
          controller.close();
          return;
        }

        try {
          const newMessages = await getMessagesSince(id, lastTimestamp);

          for (const msg of newMessages) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(msg)}\n\n`)
            );
          }

          if (newMessages.length > 0) {
            lastTimestamp = Date.now();
          }

          // Heartbeat every ~15 seconds (10 polls at 1.5s each)
          heartbeatCount++;
          if (heartbeatCount >= 10) {
            controller.enqueue(encoder.encode(`: heartbeat\n\n`));
            heartbeatCount = 0;
          }

          // Poll again after 1.5 seconds
          setTimeout(poll, 1500);
        } catch {
          controller.close();
        }
      };

      // Start initial heartbeat
      controller.enqueue(encoder.encode(`: connected\n\n`));
      poll();

      // Clean up on abort
      abortSignal.addEventListener("abort", () => {
        controller.close();
      });
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
