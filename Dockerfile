# ==============================================================================
# Multi-Stage Dockerfile for AlmaBetter AI Project Evaluation Engine
# Designed for production deployment on AWS ECS Fargate or Kubernetes
# ==============================================================================

# Stage 1: Build Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Production Runtime
FROM node:20-alpine AS runner
WORKDIR /app

# Security: Create non-root unprivileged service user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

ENV NODE_ENV=production
ENV PORT=5000

COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
COPY public ./public
COPY SYSTEM_DESIGN_DOCUMENT.html ./public/SYSTEM_DESIGN_DOCUMENT.html
COPY SYSTEM_DESIGN_DOCUMENT.md ./SYSTEM_DESIGN_DOCUMENT.md

# Assign non-root permissions
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 5000

# Container Healthcheck (AWS ALB / Docker Swarm)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5000/api/v1/health || exit 1

CMD ["node", "src/server.js"]
