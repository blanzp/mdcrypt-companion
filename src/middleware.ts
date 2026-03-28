import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /login
     * - /api/auth (NextAuth routes)
     * - /_next (Next.js internals)
     * - /icons, /manifest.json, /sw.js (PWA assets)
     * - static files (favicon, images, etc.)
     */
    "/((?!login|api/auth|api/debug|_next|icons|manifest\\.json|sw\\.js|favicon\\.ico|.*\\.png$|.*\\.svg$).*)",
  ],
};
