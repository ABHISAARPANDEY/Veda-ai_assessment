# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies (cached layer)
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev=false

# Build TypeScript
FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json

# Final runtime image
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# uploads dir for avatars
RUN mkdir -p /app/uploads
VOLUME ["/app/uploads"]
EXPOSE 4000
# Default to the combined API + worker entry point so we fit on Render's free
# tier (which no longer offers a separate background-worker service type).
# To split them back into two services later, override CMD on each service to
# "node dist/index.js" (API) and "node dist/worker.js" (worker).
CMD ["node", "dist/combined.js"]
