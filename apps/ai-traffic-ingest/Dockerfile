# Build from the repository root.
FROM oven/bun:1.4.0-alpine@sha256:07235578f79ef8c6f97d94aee7938e76f5cdba5f21ae5dbfdd3d3d38058437eb AS builder
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
COPY patches ./patches
COPY apps/agent/package.json ./apps/agent/package.json
COPY apps/ai-traffic-ingest/package.json ./apps/ai-traffic-ingest/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/dashboard/package.json ./apps/dashboard/package.json
COPY apps/docs/package.json ./apps/docs/package.json
COPY apps/onboarding-agent/package.json ./apps/onboarding-agent/package.json
COPY apps/ui/package.json ./apps/ui/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/ai/package.json ./packages/ai/package.json
COPY packages/analytics/package.json ./packages/analytics/package.json
COPY packages/content-generation/package.json ./packages/content-generation/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/email/package.json ./packages/email/package.json
COPY packages/geo/package.json ./packages/geo/package.json
COPY packages/geo-core/package.json ./packages/geo-core/package.json
COPY packages/kiwi/package.json ./packages/kiwi/package.json
COPY packages/posthog/package.json ./packages/posthog/package.json
COPY packages/schemas/package.json ./packages/schemas/package.json
COPY packages/tools/package.json ./packages/tools/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/utils/package.json ./packages/utils/package.json
RUN bun install --frozen-lockfile --ignore-scripts
COPY packages/ai ./packages/ai
COPY packages/analytics ./packages/analytics
COPY packages/db ./packages/db
COPY packages/geo-core ./packages/geo-core
COPY packages/posthog ./packages/posthog
COPY packages/schemas ./packages/schemas
COPY packages/utils ./packages/utils
COPY packages/typescript-config ./packages/typescript-config
COPY apps/ai-traffic-ingest ./apps/ai-traffic-ingest
RUN bun run --filter=ai-traffic-ingest build

FROM oven/bun:1.4.0-alpine@sha256:07235578f79ef8c6f97d94aee7938e76f5cdba5f21ae5dbfdd3d3d38058437eb
WORKDIR /app
COPY --from=builder /app/apps/ai-traffic-ingest/dist ./dist
USER bun
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "dist/index.js"]
