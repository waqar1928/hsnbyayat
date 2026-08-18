# HSN BY AYAT — production image.
# Builds the full app (storefront + admin + API) and runs it with `next start`.
# Ships with the full node_modules (not Next's "standalone" trimming) so the
# Prisma CLI stays available at runtime for `prisma migrate deploy` on boot.

# Node 22 required: @prisma/streams-local (a transitive Prisma 7 dependency)
# declares an engines.node >=22.0.0 requirement — npm ci warns/can fail
# resolving it on Node 20.
FROM node:22-slim AS base
WORKDIR /app

# --- deps ---
FROM base AS deps
# openssl is required by Prisma's query engine. Neither the mariadb driver
# (pure JS) nor sharp (ships prebuilt platform binaries) need a C++ build
# toolchain, so there's nothing else to install here.
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
# package.json's postinstall runs `prisma generate`, which needs the schema
# to exist — copy just prisma.config.ts (points at the schema path) and
# schema.prisma itself, not the whole prisma/ directory. Migrations and the
# seed/deploy scripts under prisma/ change independently of npm dependencies
# and shouldn't invalidate this layer's cache every time one of them does;
# the full prisma/ directory is copied later in the builder stage instead.
COPY prisma.config.ts ./prisma.config.ts
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npm ci

# --- build ---
FROM base AS builder
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
# `npm run build` (used by the Hostinger deploy path, where the build runs
# on the same host the database already lives on) also seeds/migrates the
# database as part of the build — that requires a live DB connection during
# `next build` itself. In this Docker image, the database is only reachable
# once the container is actually running, never during `docker build`, so
# `build:docker` runs plain `next build` with none of that — no DB access,
# no secrets, needed here at all. Those same steps run instead in this
# image's CMD below, once the container has actually started and the DB is
# reachable. (See also src/app/sitemap.ts: sitemap.xml is forced dynamic for
# the same reason — Next would otherwise try to statically prerender it
# against the database at this exact build step.)
RUN npm run build:docker

# --- runtime ---
FROM base AS runner
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/src/generated ./src/generated
# CMD below runs prisma/deploy-seed-if-empty.ts and
# prisma/migrate-legacy-uploads.ts directly via tsx at container start —
# both import from src/lib (dbAdapter.ts, storage.ts), so that needs to be
# present here too, not just the generated Prisma client.
COPY --from=builder /app/src/lib ./src/lib

# Local upload storage needs a writable dir when STORAGE_DRIVER=local.
RUN mkdir -p /app/public/uploads

EXPOSE 3000
# Runs once per container start, now that the database is actually
# reachable (never true during `docker build` — see the builder stage's
# comment above): apply any pending schema migrations, seed the database if
# it's genuinely empty (first boot only — a no-op every time after), fix up
# any pre-existing /uploads/<key> URLs left over from an older image, then
# start the server. Each step is safe to run on every boot.
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/deploy-seed-if-empty.ts && npx tsx prisma/migrate-legacy-uploads.ts && npm start"]
