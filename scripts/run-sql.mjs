// Run a SQL file against DATABASE_URL: node --env-file=.env.local scripts/run-sql.mjs drizzle/<file>.sql
import { readFile } from "node:fs/promises";
import postgres from "postgres";

const file = process.argv[2];
if (!file || !process.env.DATABASE_URL) {
  console.error("usage: DATABASE_URL must be set; node scripts/run-sql.mjs <file.sql>");
  process.exit(1);
}
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  await sql.unsafe(await readFile(file, "utf8"));
  const cols = await sql`select column_name from information_schema.columns where table_name = 'users' order by ordinal_position`;
  console.log(`ran ${file}; users columns: ${cols.map((c) => c.column_name).join(", ")}`);
} finally {
  await sql.end();
}
