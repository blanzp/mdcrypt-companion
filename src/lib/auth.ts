import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./db/schema";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: "admin" | "member";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    role: "admin" | "member";
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user, profile }) {
      if (!user.email) return false;

      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1);

      if (!existing) return false;

      if (existing.inviteStatus === "pending") {
        await db
          .update(users)
          .set({
            googleId: profile?.sub ?? null,
            name: user.name ?? null,
            inviteStatus: "active",
          })
          .where(eq(users.id, existing.id));
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user?.email) {
        const [dbUser] = await db
          .select({ id: users.id, role: users.role })
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1);

        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
        }
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.userId;
      session.user.role = token.role;
      return session;
    },
  },
};
