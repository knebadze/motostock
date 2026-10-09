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
# The `migrate` service (docker-compose.yml) runs this stage as `node` and is
# usually the FIRST container to mount the backend_uploads volume on a fresh
# server (DEPLOY.md: migrate + seed run before `up`). Docker seeds a new
# named volume from the image's own directory at that path — without this,
# there's none (uploads/ is .dockerignore'd), the volume root comes out
# root-owned, and the seed (then every admin upload) fails with EACCES.
RUN mkdir -p /app/uploads && chown node:node /app/uploads

# Lean production image — no prisma CLI, no TypeScript, no test tooling.
FROM base AS runner
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
# Run as the image's built-in unprivileged `node` user, not root. uploads/
# is the only path the app writes to (lib/storage.ts); creating it here
# owned by node means a fresh named volume mounted over it inherits that
# ownership. An EXISTING volume keeps its old root-owned files — see
# DEPLOY.md's one-time chown step.
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
