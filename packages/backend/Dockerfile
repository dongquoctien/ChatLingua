# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/backend/package*.json ./packages/backend/

# Install dependencies
RUN npm ci --workspace=@chatlingua/shared --workspace=@chatlingua/backend

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend

# Build shared first, then backend
RUN npm run build -w @chatlingua/shared
RUN npm run build -w @chatlingua/backend

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/backend/package*.json ./packages/backend/

# Install production dependencies only
RUN npm ci --workspace=@chatlingua/shared --workspace=@chatlingua/backend --omit=dev

# Copy built files
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist

# Set ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "packages/backend/dist/index.js"]
