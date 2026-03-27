import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { eq, or, desc } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sessions, sessionParticipants } from "@/lib/db/schema";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const userSessions = await db
    .selectDistinctOn([sessions.id], {
      id: sessions.id,
      title: sessions.title,
      mode: sessions.mode,
      ownerId: sessions.ownerId,
      createdAt: sessions.createdAt,
      updatedAt: sessions.updatedAt,
    })
    .from(sessions)
    .leftJoin(
      sessionParticipants,
      eq(sessions.id, sessionParticipants.sessionId)
    )
    .where(
      or(
        eq(sessions.ownerId, userId),
        eq(sessionParticipants.userId, userId)
      )
    )
    .orderBy(sessions.id, desc(sessions.updatedAt));

  return NextResponse.json(userSessions);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mode, title, participantIds } = await req.json();

  if (!mode || !["private", "shared"].includes(mode)) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  const [newSession] = await db
    .insert(sessions)
    .values({
      ownerId: session.user.id,
      title: title || "New conversation",
      mode,
    })
    .returning();

  // Add owner as participant
  await db.insert(sessionParticipants).values({
    sessionId: newSession.id,
    userId: session.user.id,
  });

  // Add additional participants for shared sessions
  if (mode === "shared" && participantIds?.length) {
    await db.insert(sessionParticipants).values(
      participantIds.map((userId: string) => ({
        sessionId: newSession.id,
        userId,
      }))
    );
  }

  return NextResponse.json(newSession, { status: 201 });
}
