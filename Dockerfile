# HSN BY AYAT — production image.
# Builds the full app (storefront + admin + API) and runs it with `next start`.
# Ships with the full node_modules (not Next's "standalone" trimming) so the
# Prisma CLI stays available at runtime for `prisma migrate deploy` on boot.

FROM node:22-bookworm-slim AS base
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
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

# --- build ---
FROM base AS builder
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

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
COPY --from=builder /app/src/generated ./src/generated

# Local upload storage needs a writable dir when STORAGE_DRIVER=local.
RUN mkdir -p /app/public/uploads

EXPOSE 3000
# Applies any pending migrations, then starts the server. Safe to run on
# every boot — a no-op when the schema is already up to date.
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
