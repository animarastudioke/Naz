# KaziHQ Windows launcher

`KaziHQ.exe` is a small double-click launcher for running KaziHQ locally on
Windows via Docker Desktop. It does not contain the app itself — it drives
`docker compose` against the rest of this repository.

## Requirements

- **Docker Desktop** for Windows, installed and running: https://www.docker.com/products/docker-desktop/
  (the free Docker Desktop license covers personal/local use)

## Setup

1. Download/copy this whole repository onto your PC.
2. Copy `KaziHQ.exe` into the **root** of the repo — the same folder that
   contains `docker-compose.yml`, `apps/`, and `packages/`.
3. Make sure Docker Desktop is running (its whale icon in the system tray
   should say "Docker Desktop is running").
4. Double-click `KaziHQ.exe`.

## What it does

1. Checks Docker is available.
2. If `apps/api/.env` or `apps/web/.env` don't exist yet, creates them with
   sane local defaults and randomly generated JWT secrets (safe for local
   use; not meant for a real internet-facing deployment).
3. Runs `docker compose up --build -d` — the first run builds the Postgres,
   Redis, API and web images, which can take several minutes. Later runs
   are much faster since Docker caches the build.
4. Waits for the API and web app to respond, then opens your browser to
   `http://localhost:3000`.
5. Keeps the console window open. Press **Enter** in that window (or close
   it) to stop KaziHQ and shut down its containers.

## Adding real M-Pesa / Stripe / WhatsApp / AI credentials

The generated `apps/api/.env` works out of the box with all of those
integrations in "dry run" mode (they log what they would have done instead
of calling the real API). To connect real credentials, either:

- Edit `apps/api/.env` directly and re-run `KaziHQ.exe` (or `docker compose
  restart api`), or
- Log in to the dashboard and add them under **Settings** once running —
  those are stored per-business in the database and take effect immediately.

## Troubleshooting

- **"Docker doesn't seem to be installed or running"** — start Docker
  Desktop and wait for it to fully start, then run `KaziHQ.exe` again.
- **"couldn't find docker-compose.yml next to this program"** — move
  `KaziHQ.exe` into the repo's root folder.
- **A `docker compose up` build fails with an npm error** — this can
  happen once on a slow/unstable connection during the very first build.
  Just run `KaziHQ.exe` again; Docker resumes from where it left off. If it
  keeps failing, run `docker compose build --no-cache` from a terminal in
  the repo folder to see the full error.
- **Ports 3000 / 4000 / 5432 already in use** — something else on your PC
  is already using one of those ports. Stop it, or change the port mappings
  in `docker-compose.yml`.

## Rebuilding the launcher from source

`main.go` is a small, dependency-free Go program. With Go installed:

```
cd desktop-launcher
go build -o KaziHQ.exe main.go
```

It can also be cross-compiled from Linux/macOS:

```
GOOS=windows GOARCH=amd64 go build -o KaziHQ.exe main.go
```
