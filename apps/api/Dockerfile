FROM node:24.17.0-alpine AS deps
WORKDIR /app
COPY package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm install --workspace @hvac/api --include-workspace-root

FROM node:24.17.0-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY apps/api ./apps/api
RUN npm run build --workspace @hvac/api

FROM node:24.17.0-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules
RUN mkdir -p /data/storage && chown -R app:app /data/storage /app
USER app
EXPOSE 3001
CMD ["node", "dist/main.js"]
