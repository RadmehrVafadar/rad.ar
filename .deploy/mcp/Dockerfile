# rad.ar MCP server, using the root workspace lockfile and shared HTTP client.
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++ libc-dev
COPY package*.json tsconfig.base.json nest-cli.json webpack.config.js ./
COPY apps ./apps
COPY packages ./packages
COPY prisma ./prisma
RUN npm ci
RUN npx nest build mcp

FROM node:22-alpine AS runtime
WORKDIR /app/apps/mcp
RUN apk add --no-cache curl
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/mcp/node_modules ./node_modules
COPY --from=builder /app/apps/mcp/dist ./dist
COPY --from=builder /app/apps/mcp/package.json ./package.json
ENV NODE_ENV=production MCP_TRANSPORT=http PORT=3002
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD curl -f http://localhost:3002/health || exit 1
CMD ["node", "dist/index.js"]
