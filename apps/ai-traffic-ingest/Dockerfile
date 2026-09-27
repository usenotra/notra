# Build from the repository root.
FROM oven/bun:1.4.0-alpine@sha256:07235578f79ef8c6f97d94aee7938e76f5cdba5f21ae5dbfdd3d3d38058437eb AS builder
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile --ignore-scripts
RUN bun run --filter=ai-traffic-ingest build

FROM oven/bun:1.4.0-alpine@sha256:07235578f79ef8c6f97d94aee7938e76f5cdba5f21ae5dbfdd3d3d38058437eb
WORKDIR /app
COPY --from=builder /app/apps/ai-traffic-ingest/dist ./dist
USER bun
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "dist/index.js"]
