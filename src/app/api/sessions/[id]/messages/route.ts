import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { messages, users } from "@/lib/db/schema";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const sessionMessages = await db
    .select({
      id: messages.id,
      sessionId: messages.sessionId,
      senderId: messages.senderId,
      senderName: users.name,
      senderEmail: users.email,
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .leftJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.sessionId, id))
    .orderBy(asc(messages.createdAt));

  return NextResponse.json(sessionMessages);
}
