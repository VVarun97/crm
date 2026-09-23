# ==========================================
# 1. Build Client Frontend
# ==========================================
FROM node:22-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ==========================================
# 2. Build Server Backend
# ==========================================
FROM node:22-alpine AS server-builder
WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci

COPY server/prisma ./prisma
RUN npx prisma generate

COPY server/ ./
RUN npm run build

# ==========================================
# 3. Production Runner
# ==========================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies for server
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev

# Copy generated Prisma Client and Schema
COPY --from=server-builder /app/server/node_modules/.prisma ./node_modules/.prisma
COPY --from=server-builder /app/server/node_modules/@prisma ./node_modules/@prisma
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/prisma ./prisma

# Copy built React frontend
COPY --from=client-builder /app/client/dist /app/client/dist

WORKDIR /app/server

EXPOSE 5000

# Push DB schema, run seed if database is empty, and start server
CMD ["sh", "-c", "npx prisma db push && node -e \"require('./dist/index.js')\""]
