# KaziHQ

**The all-in-one business platform for African freelancers, agencies, photographers, event companies and service businesses — a modern, WhatsApp-first, M-Pesa-native alternative to Bookipi and Xero.**

KaziHQ combines client booking, quotations, invoicing, payments, CRM, expense tracking, team management, business analytics and AI-assisted automation into a single product, built as a multi-tenant SaaS from day one.

## Why KaziHQ, not Bookipi/Xero

| Differentiator | What it means |
|---|---|
| **WhatsApp-first communication** | Bookings, quotes, invoices and reminders are sent (and can be approved) over WhatsApp, not just email. |
| **M-Pesa STK Push** | Clients pay directly from an invoice/quote link — no manual paybill entry. |
| **Event/service packages** | First-class support for bundled packages (wedding photography, hotel stays, agency retainers). |
| **Client approval via WhatsApp link** | Quotes carry a public, token-based approval page with e-signature — no client login required. |
| **Kenyan tax/VAT support** | KRA PIN, 16% VAT defaults, KES currency, invoice numbering suited to local compliance. |
| **AI quote generator from a WhatsApp conversation** | Paste a client chat; an LLM (or a deterministic fallback with no AI key configured) drafts a priced quotation from it. |
| **Vendor/team payout tracking** | Track what you owe photographers, MCs, caterers or contractors per booking. |

## Monorepo layout

```
apps/
  api/            NestJS backend (REST API, Prisma/PostgreSQL, all business logic)
  web/             Next.js 14 (App Router) frontend — dashboard + public client-facing pages
packages/
  shared/          Shared TypeScript types, zod validation schemas, money/tax math, enums
docker-compose.yml Postgres + Redis + api + web for local/staging deployment
```

## Tech stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, plain SVG chart components (no chart library dependency)
- **Backend:** NestJS 10, REST API, class-validator DTOs, Passport JWT auth
- **Database:** PostgreSQL via Prisma ORM (see `apps/api/prisma/schema.prisma` for the full data model)
- **Payments:** Safaricom Daraja API (M-Pesa STK Push), Stripe Checkout
- **Messaging:** WhatsApp Cloud API (Meta), SMTP email (nodemailer)
- **AI:** Anthropic Claude via `@anthropic-ai/sdk`, with tool-use for structured quote extraction; degrades to a rule-based fallback when no API key is configured
- **Infra:** Docker, npm workspaces monorepo

## System architecture

```
                 ┌─────────────────────┐
                 │   Next.js Web App    │  Dashboard (staff) + public pages (clients)
                 └──────────┬──────────┘
                            │ REST (JWT bearer / public tokens)
                 ┌──────────▼──────────┐
                 │     NestJS API       │
                 │  ─────────────────  │
                 │  Auth & RBAC guard   │  every request scoped to a businessId (tenant)
                 │  Business modules:   │  Business, Clients, Bookings, Quotations,
                 │  ...                 │  Invoices, Payments, Expenses, Analytics,
                 │                      │  WhatsApp, AI, Public, Scheduler
                 └──────────┬──────────┘
                            │ Prisma Client
                 ┌──────────▼──────────┐
                 │     PostgreSQL       │  one schema, tenant-scoped by businessId FK
                 └──────────────────────┘

External integrations: Safaricom Daraja (M-Pesa), Stripe, WhatsApp Cloud API, SMTP, Anthropic API
```

### Multi-tenancy model

- A `Business` is the tenant. Every domain table (`Client`, `Booking`, `Quotation`, `Invoice`, `Payment`, `Expense`, …) carries a `businessId` foreign key.
- A `User` can belong to multiple businesses via `BusinessUser` (the membership/staff record), each with a `StaffRole` (`OWNER`, `ADMIN`, `MANAGER`, `STAFF`, `VENDOR`) mapped to a fixed `Permission` set (`packages/shared/src/enums.ts`).
- JWT access tokens are **scoped to one business** at a time (`businessId`, `membershipId`, `role`, `permissions` in the payload). Users with multiple memberships select which workspace to enter at login (`/auth/select-business`), the same pattern Slack/Notion use for multi-workspace accounts.
- A `PermissionsGuard` + `@RequirePermissions()` decorator enforce authorization per-route; `CurrentBusinessId()` injects the tenant id so every service method is naturally tenant-scoped by construction.

### Public, token-based surfaces (no login required)

These are the pages a **client** interacts with, reached via WhatsApp/email links:

| Route | Purpose |
|---|---|
| `/book/:slug` | Public booking page — pick a service, see live availability, self-book |
| `/q/:token` | Quotation approval page — review line items, type-to-sign, approve/decline |
| `/i/:token` | Invoice view — see balance, pay via M-Pesa STK push |
| `/pay/:token` | Standalone payment link |
| `/b/:token` | Booking self-service — reschedule or cancel |

Each of these resolves via a unique `publicToken` (cuid) stored on the relevant row — never the tenant's internal id — so links are safe to share externally.

## API structure (all routes under `/api/v1`)

- `auth` — register, login, select-business, refresh, logout
- `business` — profile, branches, integrations (M-Pesa/Stripe/WhatsApp credentials)
- `users` — team invites, role management
- `clients` — CRM: profiles, communication timeline, loyalty points
- `services`, `bookings` — catalog, packages, availability engine, appointment lifecycle
- `quotations` — builder, send, public approval/decline, convert-to-invoice
- `invoices` — builder, recurring invoices, credit notes, PDF, send, public view
- `payments` — M-Pesa STK push (+ callback), Stripe Checkout (+ webhook), payment links, manual/reconciliation
- `expenses`, `vendor-payouts` — spend tracking and vendor/team payout ledger
- `analytics` — revenue dashboard, sales trend, top services, acquisition, conversion rates, monthly report
- `whatsapp` — Cloud API webhook (verify + inbound), conversation log, manual send
- `ai` — quote-from-conversation, AI invoice descriptions, pricing suggestions, demand forecast
- `public` — the client-facing endpoints backing the pages above

Full request/response shapes live next to each controller in `apps/api/src/*/dto`.

## Database schema

The complete, authoritative schema is `apps/api/prisma/schema.prisma`. High-level entity groups:

- **Tenancy & identity:** `Business`, `BusinessIntegration`, `Branch`, `User`, `BusinessUser`, `RefreshToken`, `ActivityLog`
- **CRM:** `Client`, `CommunicationEntry`, `LoyaltyProgram`
- **Catalog & bookings:** `Service`, `ServicePackage`, `ServicePackageItem`, `Booking`
- **Quotations:** `QuoteTemplate`, `Quotation`, `QuotationItem`
- **Invoicing:** `Invoice`, `InvoiceItem`, `CreditNote`, `DocumentCounter` (per-business, per-year sequential numbering)
- **Payments:** `Payment` (unifies M-Pesa, Stripe, bank transfer, cash, payment-link records)
- **Expenses & payouts:** `Expense`, `VendorPayout`
- **Automation & messaging:** `WhatsAppMessage`, `AutomationRule`

Every write path that changes money (quotation totals, invoice totals/balances, payments) goes through the shared calculation helpers in `packages/shared/src/money.ts`, so tax/discount/deposit math is identical between the quote builder, invoice builder and PDF renderer.

## Automation workflows (Phase 2)

`apps/api/src/scheduler/scheduler.service.ts` runs on cron:

- **Hourly:** flags invoices past due as `OVERDUE` and sends a WhatsApp + email reminder (throttled to once per 72h)
- **Hourly:** sends a WhatsApp booking reminder 24h before appointment time
- **Daily at 06:00:** generates the next instance of any recurring invoice whose `nextRecurrenceDate` has arrived

## AI features (Phase 3, partially shipped in MVP)

- **Quote-from-WhatsApp-conversation:** paste a chat transcript, get a structured, priced quotation draft matched against your service catalog (Claude tool-use for structured output; degrades gracefully to keyword matching if no `ANTHROPIC_API_KEY` is set)
- **AI invoice line-item descriptions**
- **Pricing suggestions:** statistical (median of realized invoice prices), not a black-box model
- **Demand forecast:** trailing-average heuristic over booking history — deliberately simple/explainable rather than a opaque ML model, upgradeable later

## Getting started (local development)

### Prerequisites
- Node.js 20+, npm 10+
- PostgreSQL 15+ (or `docker compose up postgres`)

### Setup

```bash
npm install

cp apps/api/.env.example apps/api/.env      # fill in DATABASE_URL at minimum
cp apps/web/.env.example apps/web/.env

npm run prisma:migrate --workspace=apps/api  # creates schema + runs migrations
npm run seed --workspace=apps/api            # optional demo data (owner@nairobilens.demo / Passw0rd!)

npm run dev:api   # http://localhost:4000/api/v1
npm run dev:web   # http://localhost:3000
```

### Docker

```bash
docker compose up --build
```

### Windows desktop launcher

For running KaziHQ locally on a Windows PC without touching a terminal, see
[`desktop-launcher/`](./desktop-launcher/) — a double-click `.exe` that drives
`docker compose` for you (requires Docker Desktop). See its README for setup
and troubleshooting.

## Security & compliance

- Passwords hashed with bcrypt (cost 12); refresh tokens stored as SHA-256 hashes, rotated on use
- All mutating actions pass through an `ActivityLog`-writing interceptor for audit trails
- Rate limiting via `@nestjs/throttler`; `helmet` HTTP headers on the API
- Tenant isolation enforced at the query layer (every service method requires a `businessId`) rather than relying on the client to scope requests
- Integration secrets (M-Pesa, Stripe, WhatsApp) are stored per-business and never returned to the frontend — only a `*Configured: boolean` flag is exposed
- GDPR/Kenya DPA-ready by design: clients can be deleted (`DELETE /clients/:id`), all PII lives behind authenticated/tenant-scoped routes

**Known MVP simplification to revisit before scaling Stripe usage:** the Stripe webhook currently verifies against one platform-level `STRIPE_WEBHOOK_SECRET` rather than a per-business secret. For true multi-tenant Stripe (each business's own Stripe account), move to Stripe Connect with per-account webhook endpoints.

## Roadmap

**Phase 1 — shipped in this MVP:** Booking engine (availability, packages, self-service, reminders) · CRM (profiles, timeline, loyalty) · Quotation builder with WhatsApp/e-signature approval · Invoicing (recurring, credit notes, PDF, multi-currency-ready schema)

**Phase 2 — shipped in this MVP:** M-Pesa STK Push + Stripe + payment links + reconciliation · Revenue/conversion/acquisition analytics · Automation (overdue reminders, booking reminders, recurring invoice generation)

**Phase 3 — partially shipped, to extend:**
- AI assistant: ship real demand forecasting (time-series model) once there's enough transaction history; expand the WhatsApp-conversation quote assistant into a full inbox-triage assistant
- Advanced accounting: chart of accounts, bank feed reconciliation, multi-currency FX revaluation, KRA e-TIMS/eTax integration
- Mobile: React Native app reusing `packages/shared` for validation/business rules (the REST API is already mobile-ready; no web-only assumptions)
- Stripe Connect for true per-tenant card processing; SMS channel (Africa's Talking) alongside WhatsApp
