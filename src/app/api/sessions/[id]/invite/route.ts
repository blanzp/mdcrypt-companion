import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sessions, sessionParticipants, users } from "@/lib/db/schema";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { userIds } = await req.json();

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json(
      { error: "userIds array is required" },
      { status: 400 }
    );
  }

  // Verify caller is the session owner
  const [chatSession] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, id))
    .limit(1);

  if (!chatSession) {
    return NextResponse.json(
      { error: "Session not found" },
      { status: 404 }
    );
  }

  if (chatSession.ownerId !== session.user.id) {
    return NextResponse.json(
      { error: "Only the session owner can invite participants" },
      { status: 403 }
    );
  }

  if (chatSession.mode !== "shared") {
    return NextResponse.json(
      { error: "Cannot invite to a private session" },
      { status: 400 }
    );
  }

  // Add participants (ignore conflicts for already-added users)
  for (const userId of userIds) {
    try {
      await db.insert(sessionParticipants).values({
        sessionId: id,
        userId,
      });
    } catch {
      // Ignore duplicate key errors
    }
  }

  // Return updated participant list
  const participants = await db
    .select({
      userId: sessionParticipants.userId,
      name: users.name,
      email: users.email,
      joinedAt: sessionParticipants.joinedAt,
    })
    .from(sessionParticipants)
    .innerJoin(users, eq(sessionParticipants.userId, users.id))
    .where(eq(sessionParticipants.sessionId, id));

  return NextResponse.json(participants);
}
