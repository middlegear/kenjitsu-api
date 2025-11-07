# ==========================================
#  Build Stage
# ==========================================
FROM node:20 AS builder

WORKDIR /app

# Copy dependency manifests and .npmrc
COPY package*.json tsconfig.json .npmrc ./

# Configure npm for GitHub Packages
ARG NPM_TOKEN
RUN if [ -n "$NPM_TOKEN" ]; then \
      npm config set //npm.pkg.github.com/:_authToken=$NPM_TOKEN; \
    fi

# Install dependencies
RUN npm install

# Copy the full source
COPY . .

# Build TypeScript
RUN npm run build


# ==========================================
#  Runtime Stage
# ==========================================
FROM node:20-alpine

WORKDIR /app

# Copy build output, package files, and static assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY package*.json .npmrc ./

# Configure npm again for GitHub Packages.
ARG NPM_TOKEN
RUN if [ -n "$NPM_TOKEN" ]; then \
      npm config set //npm.pkg.github.com/:_authToken=$NPM_TOKEN; \
    fi

# Install only production dependencies
RUN npm install --omit=dev

# Environment configuration
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start the server
CMD ["node", "dist/server.js"]
