import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const result = await db
      .select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.email, "paul.blanz@gmail.com"))
      .limit(1);

    return NextResponse.json({ ok: true, rows: result });
  } catch (error: unknown) {
    const err = error as Error & { cause?: Error; code?: string };
    return NextResponse.json({
      ok: false,
      error: err.message,
      code: err.code,
      cause: err.cause ? { message: err.cause.message, code: (err.cause as { code?: string }).code } : null,
    }, { status: 500 });
  }
}
