# ============================================
# STAGE 1: Instalar dependencias
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

# Instalar dumb-init para manejo correcto de señales (graceful shutdown)
RUN apk add --no-cache dumb-init

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ============================================
# STAGE 2: Build
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ============================================
# STAGE 3: Producción
# ============================================
FROM node:20-alpine AS production

# Labels OCI estándar para metadata
LABEL org.opencontainers.image.title="Delivery Backend API"
LABEL org.opencontainers.image.description="API RESTful para App Delivery"
LABEL org.opencontainers.image.version="1.0.0"

# Instalar dumb-init y curl (para el health check)
RUN apk add --no-cache dumb-init curl

# Usar el usuario de Node (non-root por seguridad)
USER node

WORKDIR /app

# Copiar solo los artefactos necesarios desde las otras etapas
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node package.json ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check (sistemas como AWS ECS o Kubernetes usan esto para saber si la app se colgó)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

# dumb-init como PID 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
