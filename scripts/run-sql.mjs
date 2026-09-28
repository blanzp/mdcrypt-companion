// Run a SQL file against POSTGRES_URL (or DATABASE_URL), like src/lib/db: node --env-file=.env.local scripts/run-sql.mjs drizzle/<file>.sql
import { readFile } from "node:fs/promises";
import postgres from "postgres";

const file = process.argv[2];
const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
if (!file || !url) {
  console.error("usage: POSTGRES_URL or DATABASE_URL must be set; node scripts/run-sql.mjs <file.sql>");
  process.exit(1);
}
const sql = postgres(url, { max: 1, prepare: false });
try {
  await sql.unsafe(await readFile(file, "utf8"));
  const cols = await sql`select column_name from information_schema.columns where table_name = 'users' order by ordinal_position`;
  console.log(`ran ${file}; users columns: ${cols.map((c) => c.column_name).join(", ")}`);
} finally {
  await sql.end();
}
