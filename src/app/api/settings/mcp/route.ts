import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { encrypt } from "@/lib/crypto";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select({
      mcpApiKey: users.mcpApiKey,
      mcpCryptId: users.mcpCryptId,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return NextResponse.json({
    hasKey: !!user?.mcpApiKey,
    cryptId: user?.mcpCryptId ?? null,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { apiKey, cryptId } = await req.json();

  const updateData: { mcpApiKey?: string; mcpCryptId?: string } = {};

  if (apiKey) {
    updateData.mcpApiKey = encrypt(apiKey);
  }
  if (cryptId !== undefined) {
    updateData.mcpCryptId = cryptId || null;
  }

  if (Object.keys(updateData).length > 0) {
    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, session.user.id));
  }

  return NextResponse.json({ ok: true });
}
