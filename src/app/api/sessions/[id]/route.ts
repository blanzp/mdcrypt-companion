import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sessions, sessionParticipants, messages } from "@/lib/db/schema";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { title } = await req.json();

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const [updated] = await db
    .update(sessions)
    .set({ title, updatedAt: new Date() })
    .where(eq(sessions.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Only the owner can delete
  const [chatSession] = await db
    .select({ ownerId: sessions.ownerId })
    .from(sessions)
    .where(eq(sessions.id, id))
    .limit(1);

  if (!chatSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (chatSession.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Only the owner can delete" }, { status: 403 });
  }

  // Delete messages, participants, then session
  await db.delete(messages).where(eq(messages.sessionId, id));
  await db.delete(sessionParticipants).where(eq(sessionParticipants.sessionId, id));
  await db.delete(sessions).where(eq(sessions.id, id));

  return new Response(null, { status: 204 });
}
