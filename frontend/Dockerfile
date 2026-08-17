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
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
