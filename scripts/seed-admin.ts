/**
 * Seed the first admin user.
 * Usage: npx tsx scripts/seed-admin.ts admin@example.com
 */
import { sql } from "@vercel/postgres";
import { drizzle } from "drizzle-orm/vercel-postgres";
import { users } from "../src/lib/db/schema";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/seed-admin.ts <email>");
    process.exit(1);
  }

  const db = drizzle(sql);
  const [created] = await db
    .insert(users)
    .values({ email, role: "admin", inviteStatus: "pending" })
    .returning();

  console.log("Admin user created:", created);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
