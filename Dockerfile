# ==========================================
#  Build Stage
# ==========================================
FROM node:24-alpine AS builder

WORKDIR /app

# Copy dependency manifests and .npmrc
COPY package*.json tsconfig.json .npmrc ./

# Configure npm for GitHub Packages (if provided)
ARG NPM_TOKEN
RUN if [ -n "$NPM_TOKEN" ]; then \
      npm config set //npm.pkg.github.com/:_authToken=$NPM_TOKEN; \
    fi

# Install dependencies
RUN npm ci

# Copy full source code
COPY . .

# Build TypeScript
RUN npm run build


# ==========================================
#  Runtime Stage
# ==========================================
FROM node:24-alpine

WORKDIR /app

# Copy built files and essentials
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY package*.json ./

# Configure npm for GitHub Packages (if provided)
ARG NPM_TOKEN
RUN if [ -n "$NPM_TOKEN" ]; then \
      npm config set //npm.pkg.github.com/:_authToken=$NPM_TOKEN; \
    fi

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start the server
CMD ["node", "dist/server.js"]
