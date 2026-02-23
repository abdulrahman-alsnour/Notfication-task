
import { config } from "dotenv";
config({ path: ".env.local" });

const RESET = process.argv.includes("--reset");

async function seed() {
  const { db } = await import("../lib/db");
  const {
    users,
    scopes,
    recipients,
    audiences,
    audienceRecipients,
    templates,
    systemSettings,
  } = await import("../lib/db/schema");
  const { hashPassword } = await import("../lib/auth");
  const { eq } = await import("drizzle-orm");

  if (RESET) {
    console.log("Reset: clearing existing seed data (recipients, audiences, templates, scopes)...\n");
    await db.delete(audienceRecipients);
    await db.delete(recipients);
    await db.delete(audiences);
    await db.delete(templates);
    await db.delete(scopes);
    console.log("  ✓ Cleared. Re-seeding with English data...\n");
  }

  console.log("Seeding database (Jordan: +962 numbers, English names & cities)...\n");

  // 1. Scopes (object types)
  const existingScopes = await db.select().from(scopes).limit(1);
  if (existingScopes.length === 0) {
    await db.insert(scopes).values([
      { code: "Employee", displayName: "Employee" },
      { code: "Customer", displayName: "Customer" },
    ]);
    console.log("  ✓ Scopes: Employee, Customer");
  } else {
    console.log("  ○ Scopes: already exist, skip");
  }

  // 2. Admin user
  const [existingUser] = await db.select().from(users).where(eq(users.username, "admin")).limit(1);
  let adminId: number;
  if (!existingUser) {
    const passwordHash = await hashPassword("Admin123!");
    const [inserted] = await db
      .insert(users)
      .values({
        username: "admin",
        passwordHash,
        displayName: "System Admin",
        email: "admin@example.jo",
        role: "admin",
      })
      .returning({ id: users.id });
    adminId = inserted!.id;
    console.log("  ✓ User: admin / Admin123! (System Admin)");
  } else {
    adminId = existingUser.id;
    console.log("  ○ User: admin already exists, skip");
  }

  // 3. Recipients – Jordan: +962 phones, cities in Jordan (English names)
  const jordanRecipients = [
    { name: "Ahmad Mohammad", phone: "+962791234567", scope: "Employee", city: "Amman" },
    { name: "Sara Ali", phone: "+962777654321", scope: "Employee", city: "Zarqa" },
    { name: "Mohammad Khalid", phone: "+962785123456", scope: "Employee", city: "Irbid" },
    { name: "Fatima Hassan", phone: "+962796789012", scope: "Customer", city: "Amman" },
    { name: "Ali Youssef", phone: "+962772345678", scope: "Customer", city: "Aqaba" },
    { name: "Nora Ahmad", phone: "+962798901234", scope: "Customer", city: "Madaba" },
    { name: "Khalid Omar", phone: "+962765432109", scope: "Employee", city: "Amman" },
    { name: "Layla Said", phone: "+962753210987", scope: "Customer", city: "Zarqa" },
    { name: "Youssef Ibrahim", phone: "+962789012345", scope: "Employee", city: "Irbid" },
    { name: "Hind Mahmoud", phone: "+962741234567", scope: "Customer", city: "Amman" },
  ];

  const existingRecipients = await db.select().from(recipients).limit(1);
  if (existingRecipients.length === 0) {
    for (const r of jordanRecipients) {
      await db.insert(recipients).values({
        name: r.name,
        phone: r.phone,
        scope: r.scope,
        metadata: { city: r.city, country: "Jordan" },
      });
    }
    console.log("  ✓ Recipients: 10 (+962, Jordan)");
  } else {
    console.log("  ○ Recipients: already exist, skip");
  }

  // 4. Audiences
  const [scopeEmployee] = await db.select().from(scopes).where(eq(scopes.code, "Employee")).limit(1);
  const [scopeCustomer] = await db.select().from(scopes).where(eq(scopes.code, "Customer")).limit(1);

  const existingAudiences = await db.select().from(audiences).limit(1);
  if (existingAudiences.length === 0 && scopeEmployee && scopeCustomer) {
    const [aud1] = await db
      .insert(audiences)
      .values({
        name: "All Employees",
        scope: "Employee",
        createdBy: adminId,
      })
      .returning({ id: audiences.id });
    const [aud2] = await db
      .insert(audiences)
      .values({
        name: "Jordan Customers",
        scope: "Customer",
        createdBy: adminId,
      })
      .returning({ id: audiences.id });

    const allRecipients = await db.select({ id: recipients.id, scope: recipients.scope }).from(recipients);
    const employeeIds = allRecipients.filter((r) => r.scope === "Employee").map((r) => r.id);
    const customerIds = allRecipients.filter((r) => r.scope === "Customer").map((r) => r.id);

    for (const id of employeeIds) {
      await db.insert(audienceRecipients).values({ audienceId: aud1!.id, recipientId: id });
    }
    for (const id of customerIds) {
      await db.insert(audienceRecipients).values({ audienceId: aud2!.id, recipientId: id });
    }
    console.log("  ✓ Audiences: All Employees, Jordan Customers (with members)");
  } else {
    console.log("  ○ Audiences: already exist, skip");
  }

  // 5. Templates – English, placeholders {{name}}
  const existingTemplates = await db.select().from(templates).limit(1);
  if (existingTemplates.length === 0) {
    await db.insert(templates).values([
      {
        name: "Welcome",
        objectType: "Employee",
        templateBody: "Hello {{name}}, welcome to the team. Jordan.",
        templateFields: ["name"],
        createdBy: adminId,
      },
      {
        name: "Reminder",
        objectType: "Customer",
        templateBody: "Hi {{name}}, this is a reminder for your appointment. Thank you.",
        templateFields: ["name"],
        createdBy: adminId,
      },
    ]);
    console.log("  ✓ Templates: Welcome, Reminder (with {{name}})");
  } else {
    console.log("  ○ Templates: already exist, skip");
  }

  // 6. System settings
  const existingSettings = await db.select().from(systemSettings).limit(1);
  if (existingSettings.length === 0) {
    await db.insert(systemSettings).values({
      scopeMappings: {
        Employee: { phone: "phone", name: "name" },
        Customer: { phone: "phone", name: "name" },
      },
      objectTypeIcons: { Employee: "user", Customer: "users" },
      approvalEnabled: false,
    });
    console.log("  ✓ System settings: scope mappings, approval off");
  } else {
    console.log("  ○ System settings: already exist, skip");
  }

  console.log("\nDone. You can log in with: admin / Admin123!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
