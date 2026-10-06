# syntax=docker/dockerfile:1

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
WORKDIR /app
COPY . .
# Next.js inlines NEXT_PUBLIC_* vars into the client bundle at build time —
# they must be real here, not supplied later via `docker run -e`.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
# Optional — empty/unset until the client has their own GA4 property (see
# components/shared/GoogleAnalytics.tsx and proxy.ts's CSP gating, both of
# which stay fully inert when this is unset).
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID
# Optional — Sentry. The DSN is inlined into the client bundle (empty =
# Sentry never initializes; see lib/sentry-shared.ts). The other three only
# enable source-map upload during `npm run build` (see next.config.ts):
# deliberately plain ARGs, NOT ENV — they exist only in this builder stage,
# which never ends up in the final runner image, so the auth token isn't
# shipped with the app.
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_ENVIRONMENT
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_ENVIRONMENT=$NEXT_PUBLIC_SENTRY_ENVIRONMENT
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Owned by the unprivileged `node` user the server runs as — Next writes its
# image-optimizer and ISR caches under .next/ at runtime.
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
