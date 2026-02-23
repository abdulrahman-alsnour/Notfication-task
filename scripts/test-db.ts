
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { sql } = await import("drizzle-orm");
  const { db } = await import("../lib/db");
  const result = await db.execute(sql`SELECT 1 as ok`);
  console.log("Database connection OK:", result);
}

main().catch((err) => {
  console.error("Database connection failed:", err);
  process.exit(1);
});
