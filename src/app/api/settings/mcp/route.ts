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
      mcpSharedApiKey: users.mcpSharedApiKey,
      mcpCryptId: users.mcpCryptId,
      mcpSharedCryptId: users.mcpSharedCryptId,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return NextResponse.json({
    hasKey: !!user?.mcpApiKey,
    hasSharedKey: !!user?.mcpSharedApiKey,
    cryptId: user?.mcpCryptId ?? null,
    sharedCryptId: user?.mcpSharedCryptId ?? null,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { apiKey, sharedApiKey, cryptId, sharedCryptId } = await req.json();

  const updateData: { mcpApiKey?: string; mcpSharedApiKey?: string | null; mcpCryptId?: string | null; mcpSharedCryptId?: string | null } = {};

  if (apiKey) {
    updateData.mcpApiKey = encrypt(apiKey);
  }
  if (sharedApiKey !== undefined) {
    updateData.mcpSharedApiKey = sharedApiKey ? encrypt(sharedApiKey) : null;
  }
  if (cryptId !== undefined) {
    updateData.mcpCryptId = cryptId || null;
  }
  if (sharedCryptId !== undefined) {
    updateData.mcpSharedCryptId = sharedCryptId || null;
  }

  if (Object.keys(updateData).length > 0) {
    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, session.user.id));
  }

  return NextResponse.json({ ok: true });
}
