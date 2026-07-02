# KaziHQ static frontend (Dreamweaver + Netlify)

Plain HTML, CSS, and vanilla JavaScript — **no build step, no npm, no bundler**.
Every file here can be opened directly in Dreamweaver and edited visually.
All the actual business logic (bookings, CRM, quotations, invoicing,
payments, WhatsApp, M-Pesa) lives in the NestJS API in `apps/api`, hosted on
Railway — this folder only renders it and talks to that API over HTTP.

## 1. Point it at your Railway API

Edit **one line** in `assets/js/config.js`:

```js
window.KAZIHQ_API_URL = "https://YOUR-RAILWAY-API-DOMAIN.up.railway.app/api/v1";
```

Replace with your actual Railway API domain from `DEPLOY.md` (it must end in
`/api/v1`). Do this before opening the site in Dreamweaver or deploying to
Netlify.

## 2. Allow this site to call the API (CORS)

On Railway, set the **API service's** `WEB_APP_URL` environment variable to
your Netlify site's URL (e.g. `https://your-site.netlify.app`, no trailing
slash). This is a plain runtime variable — changing it just restarts the API
container, no rebuild.

If you want both the old dashboard and this new site to work at once during
a transition, `WEB_APP_URL` accepts a comma-separated list:
`https://old-site.example.com,https://your-site.netlify.app`.

## 3. Open it in Dreamweaver

1. **Site → New Site** in Dreamweaver.
2. Set the **Local Site Folder** to this `apps/static-web` folder.
3. Every `.html` file at the root and in `dashboard/` is a real page — open
   any of them in Design or Live view and edit directly. Styling lives in
   `assets/css/styles.css` (plain CSS, semantic class names like `.btn`,
   `.card`, `.badge`, `.input`, `.table-wrap` — no build tooling, so any
   class you add or change shows up immediately).
4. The sidebar navigation on dashboard pages is injected by
   `assets/js/shell.js` (one file, so the nav only needs editing once) — it
   renders into the empty `<div id="sidebar-placeholder"></div>` you'll see
   near the top of each `dashboard/*.html` file. It'll appear in Live view
   (which runs JavaScript) but not in static Design view.
5. Data (client lists, invoice totals, etc.) is fetched from the API at
   runtime by each page's inline `<script>` block — you won't see real data
   in Dreamweaver's preview unless you're using Live view against a page
   that's actually loaded through a server (Live view can preview against
   `http://` or `https://`, not a bare `file://` path, because the browser
   blocks `fetch()` from `file://` origins).

## 4. Deploy to Netlify

**Drag-and-drop (simplest):** on Netlify, go to **Sites → Add new site → Deploy manually**, and drag this `apps/static-web` folder in.

**Git-based (auto-redeploy on push):** **Add new site → Import an existing project**, connect this repo, and set:
- **Base directory**: `apps/static-web`
- **Build command**: *(leave empty)*
- **Publish directory**: `apps/static-web` (same as base directory)

`netlify.toml` in this folder already declares `publish = "."` and an empty
build command, so Netlify shouldn't try to run a Node build.

## 5. URL routing

The API sends WhatsApp/email links in a short path form
(`/q/<token>`, `/i/<token>`, `/b/<token>`, `/pay/<token>`, `/book/<slug>`) to
keep them clean for clients. This site's pages actually read a query string
(`/q.html?token=<token>`, etc.), so `_redirects` bridges the two — Netlify
rewrites the short paths to the real static pages automatically. You don't
need to change anything for this to work; it's already in place.

| Client-facing link | Serves |
|---|---|
| `/book/:slug` | `book.html?slug=:slug` — public booking page |
| `/q/:token` | `q.html?token=:token` — quotation approval + e-signature |
| `/i/:token` | `i.html?token=:token` — invoice view + M-Pesa payment |
| `/pay/:token` | `pay.html?token=:token` — standalone payment link |
| `/b/:token` | `b.html?token=:token` — booking self-service (reschedule/cancel) |

## 6. What's here

```
index.html            Landing page
login.html / register.html / accept-invite.html
book.html / q.html / i.html / pay.html / b.html    Public, token-based pages
dashboard/             Staff-only pages (require login)
  index.html            Overview (KPIs + charts)
  clients.html / client.html
  bookings.html
  quotations.html / quotation.html
  invoices.html / invoice.html
  payments.html
  expenses.html
  team.html
  settings.html
  analytics.html
assets/
  css/styles.css        Hand-authored design system (no Tailwind/build step)
  js/config.js          Edit this: your Railway API URL
  js/api.js             Fetch wrapper + session/token storage
  js/ui.js               Formatting, HTML-escaping, modal helpers
  js/shell.js            Renders the dashboard sidebar
  js/charts.js            Small SVG line/bar charts
_redirects              Netlify path rewrites (see above)
netlify.toml            Tells Netlify there's no build step
```

## Note on the previous Next.js frontend

`apps/web` (the original React/Next.js dashboard) is still in the repo,
untouched, in case you want to compare or fall back to it. It's no longer
part of the deploy path described here — this `apps/static-web` folder is
the one you point Dreamweaver/Netlify at. Say the word if you'd like
`apps/web` removed once you've confirmed this new frontend covers what you
need.
