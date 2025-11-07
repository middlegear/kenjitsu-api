# ==========================================
# 1️⃣ Build Stage
# ==========================================
FROM node:20 AS builder


ARG NPM_TOKEN

WORKDIR /app

# Copy dependency files first
COPY package*.json tsconfig.json .npmrc ./

# Install all deps (prod + dev for build)
RUN npm install

# Copy source and build TypeScript
COPY . .
RUN npm run build


# ==========================================
# 2️⃣ Runtime Stage
# ==========================================
FROM node:20-alpine

WORKDIR /app

# Copy only built files and metadata
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# Install production-only deps
RUN npm install --omit=dev

# Environment configuration
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/server.js"]
