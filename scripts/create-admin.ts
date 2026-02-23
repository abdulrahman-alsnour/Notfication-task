
import { config } from "dotenv";
config({ path: ".env.local" });

async function createAdmin() {
  const { db } = await import("../lib/db");
  const { users } = await import("../lib/db/schema");
  const { hashPassword } = await import("../lib/auth");
  const { eq } = await import("drizzle-orm");

  const username = "admin";
  const password = "Admin123!";

  const [existing] = await db.select().from(users).where(eq(users.username, username)).limit(1);

  if (existing) {
    const passwordHash = await hashPassword(password);
    await db
      .update(users)
      .set({ passwordHash, role: "admin", displayName: "System Admin" })
      .where(eq(users.id, existing.id));
    console.log(`Updated user "${username}" to admin. You can log in with: ${username} / ${password}`);
  } else {
    const passwordHash = await hashPassword(password);
    await db.insert(users).values({
      username,
      passwordHash,
      displayName: "System Admin",
      email: "admin@example.jo",
      role: "admin",
    });
    console.log(`Created admin user. Log in with: ${username} / ${password}`);
  }
}

createAdmin().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
