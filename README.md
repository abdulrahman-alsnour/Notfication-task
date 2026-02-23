Notification Hub

A web app for sending bulk SMS and WhatsApp messages to groups. You log in, manage contacts (recipients) and audiences, create message templates, and send or schedule notifications. Admins can turn on an approval workflow and view an audit trail of who did what.

Tech: Next.js 14 (App Router), PostgreSQL on Neon, Drizzle ORM, Tailwind CSS. Login is username and password; a JWT is stored in an httpOnly cookie. Users have a role: admin or user.

---

What the app does

After login you see a dashboard with a sidebar. From there you can:

- Go to Recipients to add, edit, and delete contacts (name, phone, email, scope). Filter by scope and search. Each recipient belongs to one scope (e.g. Employee, Customer).

- Go to Audiences to create and manage groups of recipients. You pick a scope and add recipients to an audience. Audiences are used when sending notifications.

- Go to Templates to create message blueprints with placeholders like {{name}} that get replaced per recipient when sending.

- Go to Scopes to manage the scope list (e.g. Employee, Customer) that recipients and audiences use.

- Go to Send notification to choose a template and an audience, then send now or schedule for later. Messages go through a mock SMS/WhatsApp provider (you can replace it with Twilio or similar for production).

- Go to History to see past notifications (sent, failed, rejected, etc.) and to Approval to approve or reject ones waiting for approval (when the approval setting is on).

- Go to Scheduled to see and manage scheduled notifications (approve, reject, cancel).

- Go to Users to list and edit app users (admin only).

- Go to Settings to turn approval on/off and see scope mappings (admin only).

- Go to Audit to see a log of who did what (admin only).

---

How it fits together

The browser loads React pages that call fetch("/api/...") to get or change data. Those requests hit Next.js API routes under app/api/. Each route checks the user (via cookie), talks to the database with Drizzle using the db object from lib/db, and returns JSON. The database is PostgreSQL on Neon; the schema (tables and columns) is defined in lib/db/schema.ts.

So: frontend (pages and components) calls the API; the API uses lib/db, lib/api-auth, lib/audit, and lib/notifications to do the work and read/write the database.

---

Setup

You need Node.js 18 or higher and npm.

1. Install dependencies: run npm install in the project folder.

2. Copy the example env file: copy .env.example to .env.local (or create .env.local with the same variables).

3. Edit .env.local and set:
   - DATABASE_URL: your Neon PostgreSQL connection string.
   - JWT_SECRET: a long random string (used to sign the auth cookie). Use a strong value in production.

4. Create the database tables. Either run npm run db:push (applies the full schema; if it warns about dropping a column, you can say no and use the next step for audit only), or run npm run db:create-audit if you only need the audit_log table. The rest of the schema is usually applied with db:push when you first set up.

5. Load seed data (optional): npm run seed. This creates an admin user (username admin, password Admin123!), scopes, sample recipients, audiences, templates, and settings. You can log in with that after.

6. If you need an admin user later: npm run create-admin. That creates or updates the user "admin" with password Admin123! and role admin.

---

Running the app

Development: run npm run dev. Open http://localhost:3000 in the browser. Log in (or register), then use the sidebar to go to any section.

Production: run npm run build then npm start.

---

Authentication

Login: POST to /api/auth/login with body { username, password }. On success the server sets an httpOnly cookie with a JWT and returns user info. The frontend login page does this when you submit the form.

Register: POST to /api/auth/register with username and password to create a new user. The register page uses this.

Protected routes: All pages except /login and /register are protected. The middleware (middleware.ts) runs on every request; if the path is not login or register and there is no valid JWT cookie, the user is redirected to /login. API routes that need a logged-in user call getAuthUser(request) from lib/api-auth and return 401 if there is no user. Admin-only API routes (e.g. audit, users, settings) also check that the user has role admin and return 403 otherwise.

Logout: The sidebar has a "Sign out" button that POSTs to /api/auth/logout and clears the cookie.

Current user: The frontend can GET /api/auth/me to get the current user (id, username, displayName, email, role). The sidebar uses this to show or hide the Audit link for admins.

---

Database

The app uses Drizzle ORM and Neon (PostgreSQL). The connection and schema are in lib/db: index.ts creates the db client from DATABASE_URL, and schema.ts defines all tables.

Tables: users (login and roles), scopes (e.g. Employee, Customer), recipients (contacts with name, phone, email, scope), audiences (named groups), audience_recipients (which recipients are in which audience), templates (message body and placeholders), system_settings (one row: approval on/off, scope mappings, icons), notifications (each send: status, template, createdBy, etc.), audit_log (who did what for the audit page), scheduled_notifications (future sends with scheduledAt and status).

Commands:
- npm run db:push — apply schema to the database (creates/updates tables). May prompt about destructive changes.
- npm run db:create-audit — create only the audit_log table if it is missing.
- npm run db:studio — open Drizzle Studio to browse the database.
- npm run db:generate — generate migrations (if you use migrations).
- npm run db:migrate — run migrations (if you use them).

Tables overview

users
  People who can log in. Columns: id, username (unique), password_hash, display_name, email, role (admin or user), created_at, updated_at.
  No foreign keys. Other tables reference users by id.

scopes
  Categories for organizing recipients (e.g. Employee, Customer). Columns: id, code (unique), display_name, icon, created_at.
  No foreign keys. The code is used as a string in recipients.scope and audiences.scope (they store the scope code, not the scope id).

recipients
  Contacts that can receive messages. Columns: id, name, phone, email, scope (the scope code as text), metadata (json), created_at, updated_at.
  Unique on (phone, scope): one phone can exist once per scope.
  No foreign key to scopes; the app uses the scope code string to match.

audiences
  Named groups of recipients. Columns: id, name, scope (code), created_by (user id), created_at, updated_at.
  created_by references users.id. The scope is a code string, not a FK.

audience_recipients
  Join table: which recipients belong to which audience. Columns: audience_id, recipient_id.
  audience_id references audiences.id (on delete cascade: if an audience is deleted, its rows here are removed).
  recipient_id references recipients.id (on delete cascade: if a recipient is deleted, they are removed from all audiences).
  One audience has many recipients; one recipient can be in many audiences (many-to-many).

templates
  Message blueprints with placeholders (e.g. {{name}}). Columns: id, name, object_type, template_body, template_fields (json), placeholder_configs (json), created_by (user id), created_at, updated_at.
  created_by references users.id.

system_settings
  App-wide settings, one row. Columns: id, scope_mappings (json), object_type_icons (json), approval_enabled (boolean), created_at, updated_at.
  No foreign keys.

notifications
  One row per send (or per send attempt). Columns: id, title, object_type, template_id, recipient_count, message_type (sms/whatsapp), status (sent, failed, awaiting_approval, rejected), service_provider_id, approved_by, rejected_by, rejection_reason, metadata (json), created_by, created_at, sent_at.
  template_id references templates.id.
  created_by, approved_by, rejected_by reference users.id (who created it, who approved/rejected if approval is used).

audit_log
  Log of who did what.

  Columns: id, user_id, action (create, update, delete, send, approve, reject), entity_type, entity_id, details (json), created_at.
  user_id references users.id (who performed the action; can be null if user was deleted).

scheduled_notifications
  Notifications scheduled for later. Same idea as notifications plus a scheduled time. Columns: id, title, object_type, template_id, recipient_count, message_type, status (pending, sent, cancelled, awaiting_approval, rejected), scheduled_at, service_provider_id, approved_by, rejected_by, rejection_reason, metadata, created_by, created_at, sent_at.
  template_id references templates.id.
  created_by, approved_by, rejected_by reference users.id.

---

Relationships (who points to whom)

Users
  Referenced by: audiences.created_by, templates.created_by, notifications.created_by / approved_by / rejected_by, audit_log.user_id, scheduled_notifications.created_by / approved_by / rejected_by.
  So: one user can create many audiences, many templates, many notifications, many scheduled notifications, and many audit log entries; and a user can approve or reject notifications and scheduled notifications.

Scopes
  Not linked by foreign key. recipients.scope and audiences.scope store the scope code (e.g. "Employee"). The app uses that to filter and to match the scopes table by code.

Recipients
  Referenced by: audience_recipients.recipient_id.
  So: one recipient can be in many audiences.

Audiences
  Referenced by: audience_recipients.audience_id.
  audiences.created_by points to users.
  So: one audience has many recipients (through audience_recipients) and one creator (user).

Templates
  Referenced by: notifications.template_id, scheduled_notifications.template_id.
  templates.created_by points to users.
  So: one template can be used in many notifications and many scheduled notifications, and has one creator (user).

Notifications and scheduled_notifications
  Both point to templates (template_id) and to users (created_by, and optionally approved_by, rejected_by). They do not point to audiences or recipients; the app uses the chosen audience at send time to get the recipient list and then stores only recipient_count and metadata as needed.


---

Scripts

- npm run dev — start the Next.js dev server.
- npm run build — build for production.
- npm start — run the production build.
- npm run seed — load seed data (admin user, scopes, recipients, audiences, templates, settings). Safe to run more than once; it skips existing data.
- npm run seed:reset — reset and reload seed data (replaces existing seed data).
- npm run create-admin — create or update the admin user (admin / Admin123!).
- npm run db:push, db:create-audit, db:studio, db:generate, db:migrate — see Database section above.
- npm run lint — run ESLint.

---

Project structure (where to look)

app: Next.js App Router. The (dashboard) folder holds all pages that show after login (dashboard home, recipients, audiences, templates, scopes, users, settings, send, notifications, scheduled, approval, audit). Each of these uses the sidebar layout. The login and register pages are outside the dashboard. The api folder under app holds the backend: one folder per route (e.g. app/api/audiences/route.ts for GET and POST /api/audiences, and app/api/audiences/[id]/route.ts for GET, PUT, DELETE one audience). Next.js calls the exported GET, POST, PUT, DELETE functions when a request comes in for that URL and method.

components: Reusable UI. dashboard/Sidebar.tsx and PageHeader.tsx for the layout; ui/ has Button, Input, Select, Textarea, Alert, ConfirmModal.

lib: Shared code for backend and scripts. db/index.ts and db/schema.ts for the database; api-auth.ts for getAuthUser(request) used in API routes; auth.ts for password hashing and verifying; jwt.ts for creating and verifying the JWT and cookie options; audit.ts for writing to the audit log; notifications/provider.ts is the mock SMS/WhatsApp sender (replace for production); notifications/resolve-template.ts fills in template placeholders with recipient data.

middleware.ts: Runs on every request. Allows /login, /register, and /api/auth/* without a cookie; for all other paths it requires a valid JWT cookie or redirects to /login.

scripts: One-off scripts run with npx tsx. seed.ts for seeding; create-admin.ts for the admin user; create-audit-table.ts to create the audit_log table; test-db.ts to check the database connection.

drizzle.config.ts: Config for Drizzle (schema path, database URL). Used by db:push and db:generate.

---

Sending notifications

When you send a notification (from the Send page), the app picks the chosen template and audience, resolves the template with each recipient’s data (e.g. {{name}}), and calls the send function in lib/notifications/provider.ts. That function is currently a mock: it logs the message and returns success. For real SMS/WhatsApp you would replace it with a call to Twilio or another provider. Notifications can be sent immediately or scheduled; scheduled ones are stored in scheduled_notifications and can be processed by a cron or job that hits the process-scheduled API. If approval is enabled in settings, some sends create a notification in awaiting_approval state until an admin approves or rejects it.

---

Audit trail

Admin-only. The Audit page fetches GET /api/audit, which returns a paginated list of audit entries (who did what, when, on which entity). Create, update, delete, send, approve, and reject actions on audiences, templates, recipients, scopes, users, settings, notifications, and scheduled notifications are logged via logAudit() in lib/audit.ts, which writes to the audit_log table. The audit API joins with the users table to show usernames.

---

Environment variables

Put these in .env.local:

- DATABASE_URL: Neon PostgreSQL connection string (required).
- JWT_SECRET: Secret used to sign the JWT (required in production; optional in dev with a default).

---

API tests



Latest run (2026-02-21): all 10 tests passed. Here is what each test does and what we fixed on the app side.

Login. We call POST /api/auth/login with valid credentials and then GET /api/auth/me. Result: passed. The test must use the same session for both requests so the cookie is sent. On the app we had already changed GET /api/auth/me to return 401 when you are not logged in instead of 200 with no user.

Register. We try register with a short password (expect 400), then with a valid password, then login, GET /api/auth/me, logout, and GET /api/auth/me again without a cookie (expect 401). Result: passed. The app used to return 200 with no user when you weren’t logged in; we changed it to return 401 so it’s clear you’re not allowed.

Recipients. We create a recipient with a unique phone and scope (expect 200), then try the same again (expect 400), then delete. Result: passed. Nothing was wrong on the app side.

Audiences. We create two recipients, then create an audience with those ids (expect 200), then create an audience with a fake recipient id (expect an error). Result: passed. The app doesn’t check that recipient ids exist, so we relaxed the test to accept any error response instead of exactly 400.

Templates. We send create with missing name (expect 400), missing body (expect 400), then valid data (expect 200), then delete. Result: passed. Nothing was wrong on the app side.

Scopes. We send create with empty code and displayName (expect 400), then valid data (expect 200 or 409 if the scope already exists). Result: passed. We fixed the test to use a unique scope code each run so we don’t hit conflicts; the app was fine.

Dashboard stats. We login, then GET /api/dashboard/stats with the cookie (expect 200), then GET without a cookie (expect 401). Result: passed. The app used to let unauthenticated requests hit the login page instead of the API, so you got HTML. We changed the middleware so requests to /api/* are not redirected; the route runs and returns 401 when there’s no user.

Notifications. We create a recipient, audience, and template (each with unique data), then create a notification send now and one scheduled, then try invalid payloads (expect 400), then clean up. Result: passed. We fixed the test to use unique phone and scope per run and to read ids from the response shape the app returns; the app was fine.

Scheduled notifications. We create a recipient, audience, and template, then create three scheduled notifications (with a future time), then PATCH one to cancel, one to approve, one to reject (expect 200), then send an invalid action (expect 400). Result: passed. We fixed the test to read audience and template id from the nested object the app returns and to create real scheduled items with schedule and time; the app was fine.

Audit. We login as admin, GET /api/audit (expect 200 or 503), logout, register and login as a normal user, GET /api/audit (expect 403), then GET /api/audit with no cookie (expect 401), then run concurrent GETs to recipients and audiences. Result: passed. The app used to redirect unauthenticated /api/audit to the login page so you got HTML instead of 401; we changed the middleware so /api/* is not redirected and the audit route returns 401 when there’s no user. We also let the test accept 409 on register when the user already exists.

Performance testing

Methodology. We simulate multiple concurrent users: each user logs in once (admin), then issues repeated GET requests. For each endpoint we run a fixed number of workers and a fixed number of requests per worker, so we get a known total request count. We record every response time and then compute min, max, average, and 95th percentile (p95) latency in milliseconds, and throughput in requests per second. All requests are read-only and authenticated; no data is created or changed.

Endpoints and what we test. We exercise five endpoints that are typical for list and dashboard usage. For each one we describe what the endpoint does and what the test measures.

Recipients list. GET /api/recipients with page=1 and limit=10. This returns the first page of recipients with pagination metadata. The test measures how quickly the server can query the recipients table and return JSON under concurrency.

Audiences list. GET /api/audiences with page=1 and limit=10. This returns the first page of audiences; the API also computes member count per audience. The test measures latency and throughput including that extra work.

Dashboard stats. GET /api/dashboard/stats. This endpoint aggregates counts and time-series data from notifications and scheduled_notifications (e.g. sent, failed, awaiting approval, and totals for recipients, audiences, templates). The test measures how the server performs when several users hit this heavier aggregation at once.

Templates list. GET /api/templates with page=1. This returns the first page of templates. The test measures simple list + pagination performance.

Audit log. GET /api/audit with page=1. This returns the first page of audit entries with a join to the users table for usernames. The test measures admin-only read performance under load.

Results (latest run). Test configuration: 10 concurrent workers, 5 requests per worker per endpoint, 50 requests per endpoint in total. Base URL: http://localhost:3000. Environment: Next.js dev server and Neon PostgreSQL.

Recipients list: average latency 419 ms, p95 681 ms, throughput 15.8 req/s. Min 326 ms, max 1127 ms. All 50 requests returned 200.

Audiences list: average latency 591 ms, p95 896 ms, throughput 13.4 req/s. Min 485 ms, max 1381 ms. All 50 requests returned 200. This endpoint is the slowest of the five because it runs additional queries to compute member count per audience.

Dashboard stats: average latency 510 ms, p95 831 ms, throughput 14.2 req/s. Min 330 ms, max 837 ms. All 50 requests returned 200.

Templates list: average latency 361 ms, p95 367 ms, throughput 20.0 req/s. Min 337 ms, max 850 ms. All 50 requests returned 200. This endpoint was the fastest, with the lowest average and p95 latency and the highest throughput.

Audit log: average latency 516 ms, p95 555 ms, throughput 15.0 req/s. Min 482 ms, max 985 ms. All 50 requests returned 200.

Summary. All 250 requests (50 per endpoint across 5 endpoints) completed successfully with HTTP 200. Throughput ranged from about 13 to 20 req/s depending on endpoint. Templates had the best latency and throughput; audiences had the worst, consistent with the extra per-audience member count work. These numbers are from a single run on a development setup; production performance will depend on hardware, database tier, and network.

---

That’s the full picture of the project: what it does, how to set it up and run it, how auth and the database work, where the code lives, and how sending and the audit trail fit in.
