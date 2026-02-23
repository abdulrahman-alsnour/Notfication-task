import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  role: varchar("role", { length: 50 }).default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const scopes = pgTable("scopes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const recipients = pgTable(
  "recipients",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 50 }).notNull(),
    email: varchar("email", { length: 255 }),
    scope: varchar("scope", { length: 100 }).notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    recipientsPhoneScope: uniqueIndex("recipients_phone_scope").on(table.phone, table.scope),
  })
);

export const audiences = pgTable("audiences", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  scope: varchar("scope", { length: 100 }).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const audienceRecipients = pgTable("audience_recipients", {
  audienceId: integer("audience_id")
    .notNull()
    .references(() => audiences.id, { onDelete: "cascade" }),
  recipientId: integer("recipient_id")
    .notNull()
    .references(() => recipients.id, { onDelete: "cascade" }),
});

export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  objectType: varchar("object_type", { length: 100 }).notNull(),
  templateBody: text("template_body").notNull(),
  templateFields: jsonb("template_fields"),
  placeholderConfigs: jsonb("placeholder_configs"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  scopeMappings: jsonb("scope_mappings").notNull().default({}),
  objectTypeIcons: jsonb("object_type_icons").notNull().default({}),
  approvalEnabled: boolean("approval_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  objectType: varchar("object_type", { length: 100 }).notNull(),
  templateId: integer("template_id")
    .notNull()
    .references(() => templates.id),
  recipientCount: integer("recipient_count").notNull().default(0),
  messageType: varchar("message_type", { length: 50 }).notNull(), // sms | whatsapp
  status: varchar("status", { length: 50 }).notNull(), // sent | failed | awaiting_approval | rejected
  serviceProviderId: varchar("service_provider_id", { length: 255 }),
  approvedBy: integer("approved_by").references(() => users.id),
  rejectedBy: integer("rejected_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  metadata: jsonb("metadata"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
});

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: varchar("action", { length: 50 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: varchar("entity_id", { length: 100 }),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const scheduledNotifications = pgTable("scheduled_notifications", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  objectType: varchar("object_type", { length: 100 }).notNull(),
  templateId: integer("template_id")
    .notNull()
    .references(() => templates.id),
  recipientCount: integer("recipient_count").notNull().default(0),
  messageType: varchar("message_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(), // pending | sent | cancelled | awaiting_approval | rejected
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  serviceProviderId: varchar("service_provider_id", { length: 255 }),
  approvedBy: integer("approved_by").references(() => users.id),
  rejectedBy: integer("rejected_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  metadata: jsonb("metadata"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
});
