import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET() {
  try {
    // Test 1: Check env vars
    const envCheck = {
      hasPostgresUrl: !!process.env.POSTGRES_URL,
      postgresUrlPrefix: process.env.POSTGRES_URL?.slice(0, 30) + "...",
      hasDatabaseUrl: !!process.env.DATABASE_URL,
    };

    // Test 2: Raw query bypassing Drizzle
    const result = await sql`SELECT id, email, role FROM users LIMIT 1`;

    return NextResponse.json({ ok: true, envCheck, rows: result.rows });
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
