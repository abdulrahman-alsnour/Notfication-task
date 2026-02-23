
import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set. Use .env.local or set the env var.");
    process.exit(1);
  }

  const sql = neon(connectionString);

  await sql`
    CREATE TABLE IF NOT EXISTS audit_log (
      id serial PRIMARY KEY,
      user_id integer REFERENCES users(id),
      action varchar(50) NOT NULL,
      entity_type varchar(100) NOT NULL,
      entity_id varchar(100),
      details jsonb,
      created_at timestamp with time zone DEFAULT now() NOT NULL
    )
  `;

  console.log("audit_log table is ready.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
