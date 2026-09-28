import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { exchangeCode, fetchUserinfo, saveConnection } from "@/lib/brain";

// The second brain server redirects here after the user signs in with GitHub
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const back = (result: string, detail?: string) => {
    const to = new URL("/settings", req.url);
    to.searchParams.set("brain", result);
    if (detail) to.searchParams.set("detail", detail.slice(0, 200));
    const res = NextResponse.redirect(to);
    res.cookies.delete({ name: "brain_oauth", path: "/api/brain" });
    return res;
  };

  // e.g. not on the invite list, or the GitHub App isn't installed on their repo
  const error = url.searchParams.get("error");
  if (error) return back("error", url.searchParams.get("error_description") ?? error);

  const cookie = req.cookies.get("brain_oauth")?.value;
  let pending: { state: string; verifier: string; clientId: string; redirectUri: string; userId: string };
  try {
    pending = JSON.parse(decrypt(cookie ?? ""));
  } catch {
    return back("error", "Sign-in expired; try connecting again");
  }
  const code = url.searchParams.get("code");
  if (!code || url.searchParams.get("state") !== pending.state || pending.userId !== session.user.id) {
    return back("error", "Sign-in didn't match; try connecting again");
  }

  try {
    const tokens = await exchangeCode(pending.clientId, pending.redirectUri, code, pending.verifier);
    const info = await fetchUserinfo(tokens.access_token);
    await saveConnection(session.user.id, pending.clientId, tokens, info);
  } catch (err) {
    console.error("[brain callback]", err);
    return back("error", (err as Error).message);
  }
  return back("connected");
}
