import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { polls, pollVotes, sessionParticipants } from "@/lib/db/schema";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Fetch poll
  const [poll] = await db
    .select()
    .from(polls)
    .where(eq(polls.id, id))
    .limit(1);

  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  // Verify user is a session participant
  const [participation] = await db
    .select()
    .from(sessionParticipants)
    .where(
      and(
        eq(sessionParticipants.sessionId, poll.sessionId),
        eq(sessionParticipants.userId, session.user.id)
      )
    )
    .limit(1);

  if (!participation) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  // Get vote counts per option
  const voteCounts = await db
    .select({
      optionIndex: pollVotes.optionIndex,
      count: sql<number>`count(*)::int`,
    })
    .from(pollVotes)
    .where(eq(pollVotes.pollId, id))
    .groupBy(pollVotes.optionIndex);

  const options = poll.options as string[];
  const votes = new Array(options.length).fill(0);
  for (const vc of voteCounts) {
    votes[vc.optionIndex] = vc.count;
  }
  const totalVotes = votes.reduce((a: number, b: number) => a + b, 0);

  // Check if current user has voted
  const [userVote] = await db
    .select({ optionIndex: pollVotes.optionIndex })
    .from(pollVotes)
    .where(
      and(eq(pollVotes.pollId, id), eq(pollVotes.userId, session.user.id))
    )
    .limit(1);

  return NextResponse.json({
    id: poll.id,
    question: poll.question,
    options,
    votes,
    totalVotes,
    userVote: userVote?.optionIndex ?? null,
  });
}
