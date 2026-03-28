import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, "paul.blanz@gmail.com"))
      .limit(1);

    return NextResponse.json({ ok: true, count: result.length, user: result[0] ?? null });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error), stack: (error as Error).stack }, { status: 500 });
  }
}
