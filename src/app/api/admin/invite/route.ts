import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "User already exists" },
      { status: 409 }
    );
  }

  const [created] = await db
    .insert(users)
    .values({
      email: email.toLowerCase().trim(),
      role: "member",
      inviteStatus: "pending",
    })
    .returning({
      id: users.id,
      email: users.email,
      role: users.role,
      inviteStatus: users.inviteStatus,
      createdAt: users.createdAt,
    });

  return NextResponse.json(created, { status: 201 });
}
