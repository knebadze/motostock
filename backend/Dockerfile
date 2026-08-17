# syntax=docker/dockerfile:1

FROM node:22-slim AS base
WORKDIR /app
# Prisma's query engine (still fetched as a fallback even in driver-adapter
# mode) needs libssl at runtime — installed once here, reused by every
# downstream stage via FROM base.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Full devDependencies (incl. the prisma CLI) — also used directly as the
# `migrate` service in docker-compose.yml to run `prisma migrate deploy`,
# so it doesn't need its own separate image.
FROM deps AS builder
COPY . .
RUN npx prisma generate
RUN npm run build

# Lean production image — no prisma CLI, no TypeScript, no test tooling.
FROM base AS runner
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
EXPOSE 4000
CMD ["node", "dist/server.js"]
