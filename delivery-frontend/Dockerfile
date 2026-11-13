# ============================================
# STAGE 1: Instalar dependencias
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ============================================
# STAGE 2: Build estático de Vite + TypeScript
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables inyectadas en tiempo de compilación para Vite
ARG VITE_API_URL=http://localhost:3000/api/v1
ARG VITE_WS_URL=http://localhost:3000

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}

RUN npm run build

# ============================================
# STAGE 3: Servidor Nginx unprivileged (non-root)
# ============================================
FROM nginxinc/nginx-unprivileged:1.27-alpine AS production

LABEL org.opencontainers.image.title="DeliveryPro Frontend"
LABEL org.opencontainers.image.description="SPA React + PWA servida con Nginx unprivileged para App Delivery"
LABEL org.opencontainers.image.version="1.0.0"

# Configuración SPA personalizada en puerto 8080 (non-root)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar artefactos compilados desde builder
COPY --chown=nginx:nginx --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
