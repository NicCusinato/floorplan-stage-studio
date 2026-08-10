FROM node:24-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

FROM base AS builder
WORKDIR /app
ENV DATABASE_URL="file:/app/storage/dev.db"
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY public ./public
COPY prisma ./prisma
COPY package.json .
COPY package-lock.json .
COPY next.config.ts .
COPY tsconfig.json .
COPY eslint.config.mjs .
COPY postcss.config.mjs .
RUN npx prisma generate
RUN rm -rf .next
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/storage/dev.db"
ENV STORAGE_PATH="/app/storage"
# Install OpenSSL 3.x (matches linux-musl-openssl-3.0.x binary target)
RUN apk add --no-cache openssl libssl3
COPY --from=builder /app/.next/standalone .
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
# Explicitly copy the generated Prisma engine binary so it never tries to download
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public

# Prisma will automatically detect and use the correct engine binary for the host architecture

EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push && node server.js"]
