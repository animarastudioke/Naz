FROM node:20-alpine AS base
WORKDIR /repo
# Prisma's engine binaries are dynamically linked against OpenSSL, which
# node:20-alpine does not include by default. Without it, the engine process
# crashes on startup and Prisma reports a confusing "Could not parse schema
# engine response" error instead of the real cause. Installed here in the
# base stage so both `prisma generate` (at build time, so it fetches the
# engine variant matching what's actually available) and the runtime CMD
# (which executes that engine) see the same OpenSSL.
RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
# npm can print a fatal-looking "Exit handler never called!" yet still exit 0
# while leaving node_modules incomplete (a known upstream npm bug under heavy
# I/O) -- so verify the install actually produced binaries instead of trusting
# the exit code, and retry if it didn't.
RUN npm install --workspaces --include-workspace-root; \
  test -x node_modules/.bin/tsc || (rm -rf node_modules && npm install --workspaces --include-workspace-root); \
  test -x node_modules/.bin/tsc || (rm -rf node_modules && npm install --workspaces --include-workspace-root); \
  test -x node_modules/.bin/tsc

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build --workspace=packages/shared
RUN npm run prisma:generate --workspace=apps/api
RUN npm run build --workspace=apps/api

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages/shared ./packages/shared
COPY --from=build /repo/apps/api ./apps/api
WORKDIR /repo/apps/api
EXPOSE 4000
CMD ["sh", "-c", "npm run prisma:deploy && node dist/main.js"]
