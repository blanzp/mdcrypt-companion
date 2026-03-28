/**
 * Seed the first admin user.
 * Usage: DATABASE_URL="..." npx tsx scripts/seed-admin.ts <email> "Name"
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { users } from "../src/lib/db/schema";

async function main() {
  const email = process.argv[2];
  const name = process.argv[3];
  if (!email) {
    console.error('Usage: DATABASE_URL="..." npx tsx scripts/seed-admin.ts <email> "Name"');
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);
  const [created] = await db
    .insert(users)
    .values({ email, name: name ?? null, role: "admin", inviteStatus: "pending" })
    .returning();

  console.log("Admin user created:", created);
  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
