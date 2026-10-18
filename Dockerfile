FROM oven/bun:1.4.2 AS base
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Stage 1: Install dependencies and build monorepo
FROM base AS builder
COPY . .
RUN bun install
RUN bun run --cwd apps/web build

# Stage 2: Minimal production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3030
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app ./

EXPOSE 3030

CMD ["sh", "-c", "bun run apps/web/scripts/worker-daemon.ts & bun run --cwd apps/web start"]
