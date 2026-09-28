import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { authorizeUrl, callbackUrl, pkcePair, registerClient } from "@/lib/brain";

// Start connecting the user's second brain: register as an OAuth client, then send them to sign in with GitHub
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redirectUri = callbackUrl(req.url);
  let clientId: string;
  try {
    clientId = await registerClient(redirectUri);
  } catch (err) {
    console.error("[brain connect]", err);
    return NextResponse.redirect(new URL("/settings?brain=unreachable", req.url));
  }

  const state = randomBytes(16).toString("base64url");
  const { verifier, challenge } = pkcePair();
  const res = NextResponse.redirect(authorizeUrl(clientId, redirectUri, state, challenge));
  // Remembered until the callback; encrypted so the verifier never leaves the server in clear
  res.cookies.set("brain_oauth", encrypt(JSON.stringify({ state, verifier, clientId, redirectUri, userId: session.user.id })), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/brain",
    maxAge: 600,
  });
  return res;
}
