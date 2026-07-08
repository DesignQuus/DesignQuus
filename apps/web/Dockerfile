FROM node:24.17.0-alpine AS deps
WORKDIR /app
COPY package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/web/scripts apps/web/scripts
RUN npm install --workspace @hvac/web --include-workspace-root

FROM node:24.17.0-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/v1
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package-lock.json ./package-lock.json
COPY package.json ./
COPY apps/web ./apps/web
COPY --from=deps /app/apps/web/public/pdf.worker.min.mjs ./apps/web/public/pdf.worker.min.mjs
RUN npm run build --workspace @hvac/web

FROM node:24.17.0-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
USER app
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
