FROM oven/bun:1.2.4 AS base
WORKDIR /app

# Stage 1: Install dependencies
FROM base AS deps
COPY package.json bun.lock turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/copy-linter/package.json ./packages/copy-linter/
COPY packages/verifier/package.json ./packages/verifier/
COPY packages/agent-core/package.json ./packages/agent-core/
COPY packages/scrapers/package.json ./packages/scrapers/
COPY packages/database/package.json ./packages/database/
COPY packages/doc-generator/package.json ./packages/doc-generator/
COPY packages/outbound-email/package.json ./packages/outbound-email/
COPY packages/outbound-wa/package.json ./packages/outbound-wa/

RUN bun install --frozen-lockfile

# Stage 2: Build the monorepo
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js application
RUN bun run --cwd apps/web build

# Stage 3: Production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3030
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/package.json /app/bun.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web ./apps/web
COPY --from=builder /app/packages ./packages

EXPOSE 3030

CMD ["bun", "run", "--cwd", "apps/web", "start"]
