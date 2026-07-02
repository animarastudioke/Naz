FROM node:20-alpine AS base
WORKDIR /repo

FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web/package.json apps/web/package.json
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
COPY apps/web apps/web
# Next.js inlines NEXT_PUBLIC_* variables at build time, not at container
# startup, so the API's URL has to be supplied as a build argument rather
# than a normal runtime environment variable.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/web

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages/shared ./packages/shared
COPY --from=build /repo/apps/web ./apps/web
WORKDIR /repo/apps/web
EXPOSE 3000
CMD ["npm", "run", "start"]
