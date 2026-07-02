# Deploying KaziHQ to Railway

This gets you a live URL you can open from any browser — nothing installed
locally. One Railway account hosts everything: Postgres, the API, and the
web app.

Railway's free trial credit is enough to run this comfortably for
evaluation/demo use; check Railway's current pricing if you plan to keep it
running long-term.

## 1. Create the project

1. Sign up at [railway.app](https://railway.app) (GitHub login is easiest —
   it also gives Railway access to your repo).
2. **New Project** → **Deploy from GitHub repo** → pick this repository and
   the `claude/saas-business-platform-2khqub` branch.
3. Railway will try to auto-detect a service from the repo root — delete
   that auto-created service for now. We'll add the three services
   explicitly below (a monorepo with three Dockerfiles doesn't have one
   correct root service).

## 2. Add Postgres

**+ New** → **Database** → **Add PostgreSQL**. Nothing else to configure —
Railway generates a `DATABASE_URL` you'll reference from the API service.

## 3. Add the API service

**+ New** → **GitHub Repo** → same repo/branch again. Once it's created,
open its **Settings**:

- **Root Directory**: `/` (leave as the repo root — the Dockerfile needs
  the whole monorepo as build context, not just `apps/api`)
- **Dockerfile Path**: `apps/api/Dockerfile`

Then in **Variables**, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (Railway's reference syntax — type `${{` and it'll autocomplete to your Postgres service) |
| `JWT_ACCESS_SECRET` | any long random string |
| `JWT_REFRESH_SECRET` | a different long random string |
| `JWT_ACCESS_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `30d` |
| `WEB_APP_URL` | leave blank for now — you'll set this in step 5 |
| `MPESA_ENV` | `sandbox` |
| `WHATSAPP_API_VERSION` | `v20.0` |
| `ANTHROPIC_MODEL` | `claude-sonnet-5` |

(M-Pesa/Stripe/WhatsApp/Anthropic keys are optional — those features run in
"dry run" mode until you add real credentials, either here or later from
the dashboard's Settings page.)

Go to **Settings → Networking** and click **Generate Domain** to get this
service's public URL (something like `kazihq-api-production.up.railway.app`).
**Copy it** — you need it for the web service next.

Deploy the service (Railway does this automatically on save, or click
**Deploy**). The container runs `prisma migrate deploy` automatically on
boot, so the database schema is created with no extra steps. Watch the
**Deploy Logs** tab for `KaziHQ API listening on :4000` to confirm it's up.

## 4. Add the web service

**+ New** → **GitHub Repo** → same repo/branch again. In its **Settings**:

- **Root Directory**: `/`
- **Dockerfile Path**: `apps/web/Dockerfile`

Next.js bakes the API URL into the build, so this one goes under
**Variables → Build Arguments** (not regular runtime variables):

| Build argument | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<your-api-domain-from-step-3>/api/v1` |

Generate a public domain for this service too (**Settings → Networking →
Generate Domain**). **Copy it.**

## 5. Connect the two

Go back to the **API** service's variables and set:

| Variable | Value |
|---|---|
| `WEB_APP_URL` | `https://<your-web-domain-from-step-4>` (no trailing slash) |

This is a plain runtime variable, so updating it just restarts the API
container — no rebuild needed. It's used for CORS and for building the
WhatsApp/email links sent to clients (quote approval, invoice payment,
booking self-service).

## 6. Open it

Visit your web service's URL. Register a new business, or if you want demo
data, run the seed script once via Railway's CLI:

```bash
railway login
railway link          # select this project
railway run --service api npm run seed --workspace=apps/api
```

(That logs in as `owner@nairobilens.demo` / `Passw0rd!` with sample clients,
services, and a wedding package already set up.)

## Redeploying after code changes

Push to the branch Railway is watching and both services redeploy
automatically. If you only change the API's `WEB_APP_URL` or add a real
M-Pesa/Stripe/WhatsApp key, that's a runtime variable — it restarts the
container without rebuilding. If you ever need to change
`NEXT_PUBLIC_API_URL`, that's a build argument — it requires a full rebuild
of the web service (Railway does this automatically when you edit a build
argument and redeploy).

## Troubleshooting

- **Web app loads but API calls fail / CORS errors** — double-check
  `WEB_APP_URL` on the API service exactly matches the web service's public
  URL (including `https://`, no trailing slash), and that
  `NEXT_PUBLIC_API_URL` on the web service ends in `/api/v1`.
- **API container restarts in a loop** — check its Deploy Logs; the most
  common cause is `DATABASE_URL` not resolving. Confirm the Postgres
  service and API service are in the same Railway project and the
  reference variable is exactly `${{Postgres.DATABASE_URL}}`.
- **First build fails with an npm error mentioning "Exit handler never
  called"** — this is a known intermittent npm bug under heavy I/O; the
  Dockerfiles already retry automatically, but if it exhausts all retries,
  just click **Redeploy**.
