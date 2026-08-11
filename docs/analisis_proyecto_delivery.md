# 🚀 Roadmap Definitivo — Delivery Backend a Producción

Guía ordenada fase por fase. **Cada fase construye sobre la anterior — no saltes fases.**

---

## 📍 Punto de Partida

- ✅ 7 módulos NestJS funcionando (auth, users, categories, products, cart, orders, common)
- ✅ JWT + RBAC, Helmet, Throttler, ValidationPipe, HttpExceptionFilter
- ✅ Docker multi-stage básico
- ✅ Máquina de estados de pedidos + integridad referencial

---

## 🔧 FASE 0 — Blindar los 7 Módulos Existentes
**Duración:** 2-3 semanas
**Objetivo:** Que cada módulo existente sea sólido, seguro y esté listo para crecer encima.

> [!IMPORTANT]
> Esta es la fase más importante. No agregues nada nuevo hasta que los 7 módulos estén blindados.

---

### 0.1 🔑 Módulo `auth/` — Arreglos y Mejoras

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | **Crear `LoginDto`** | Actualmente el controller recibe `{ email: string; password: string }` inline. Sin DTO, el `ValidationPipe` no valida nada. Crear `login.dto.ts` con `@IsEmail()` y `@IsNotEmpty()` |
| 2 | **JWT Secret desde ConfigService** | Cambiar el hardcoded `'JWT_SECRET_KEY'` en `auth.module.ts` y `jwt.strategy.ts` por `configService.get('JWT_SECRET')`. Usar `JwtModule.registerAsync()` |
| 3 | **`@Injectable()` en JwtAuthGuard** | Falta el decorador. Sin él puede fallar la inyección de dependencias |
| 4 | **Refresh Tokens** | Implementar par access_token (15min) + refresh_token (7 días) con rotación. Crear schema `refresh-token.schema.ts`, endpoints `POST /auth/refresh` y `POST /auth/logout` |
| 5 | **Recuperación de contraseña** | `POST /auth/forgot-password` → envía token por email. `POST /auth/reset-password` → valida token y cambia password. Token expira en 15min, un solo uso |
| 6 | **Swagger decorators** | `@ApiTags('Auth')`, `@ApiOperation()`, `@ApiResponse()` en controller. `@ApiProperty()` en DTOs |
| 7 | **Tests unitarios** | `auth.service.spec.ts` — login exitoso, credenciales inválidas, usuario no encontrado, refresh token |

**Archivos a crear/modificar:**
```
src/auth/
├── auth.module.ts                  ← JwtModule.registerAsync con ConfigService
├── auth.controller.ts              ← Swagger + usar LoginDto
├── auth.service.ts                 ← Lógica refresh token, forgot/reset password
├── jwt.strategy.ts                 ← Secret desde ConfigService
├── jwt-auth.guard.ts               ← Agregar @Injectable()
├── dto/
│   ├── login.dto.ts                ← NUEVO
│   ├── refresh-token.dto.ts        ← NUEVO
│   ├── forgot-password.dto.ts      ← NUEVO
│   └── reset-password.dto.ts       ← NUEVO
├── schemas/
│   ├── refresh-token.schema.ts     ← NUEVO
│   └── password-reset.schema.ts    ← NUEVO
└── auth.service.spec.ts            ← NUEVO (tests)
```

---

### 0.2 👤 Módulo `users/` — Arreglos y Mejoras

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | **`select('-password')` en `findAll()`** | Actualmente `findAll()` retorna passwords hasheadas. Agregar `.select('-password')` |
| 2 | **Re-hashear password en `update()`** | Si `updateData` incluye password, hashearla con bcrypt antes de guardar. Actualmente se guarda en texto plano |
| 3 | **Guard de Ownership** | Cualquier usuario autenticado puede `PATCH /users/:id` y modificar otro usuario. Crear `OwnershipGuard`: solo el dueño del recurso o ADMIN puede modificar |
| 4 | **Proteger `DELETE /users/:id`** | Agregar `@Roles(Role.ADMIN)` — actualmente no tiene restricción de rol |
| 5 | **Proteger `GET /users/:id`** | Solo el dueño o ADMIN debería poder ver el detalle |
| 6 | **Validar email duplicado en `update()`** | Si el usuario cambia su email, verificar que no esté en uso por otro usuario |
| 7 | **No permitir que un usuario cambie su propio rol** | Excluir `role` del `UpdateUserDto` para usuarios normales, solo ADMIN puede cambiar roles |
| 8 | **Paginación** | `findAll()` con `page`, `limit`, `sortBy`, `search` |
| 9 | **Swagger decorators** | Todos los endpoints documentados |
| 10 | **Tests unitarios** | `users.service.spec.ts` — CRUD, email duplicado, hash, ownership |

**Archivos a crear/modificar:**
```
src/users/
├── users.controller.ts             ← Guards, Swagger, paginación
├── users.service.ts                ← select(-password), re-hash, email duplicado en update
├── dto/
│   ├── create-user.dto.ts          ← Swagger @ApiProperty()
│   └── update-user.dto.ts          ← Swagger + excluir role para no-admin
├── schema/users.schema.ts          ← Swagger
└── users.service.spec.ts           ← NUEVO (tests)
```

---

### 0.3 🏷️ Módulo `categories/` — Arreglos y Mejoras

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | **Guards en controller** | Actualmente `@Roles(Role.ADMIN)` está en los métodos pero **no hay `@UseGuards(JwtAuthGuard, RolesGuard)`** a nivel de clase ni de método. Los roles no se verifican realmente |
| 2 | **NotFoundException en `findOne`, `update`, `remove`** | Si el ID no existe, Mongoose retorna `null` silenciosamente. Agregar validación: `if (!category) throw new NotFoundException()` |
| 3 | **Paginación en `findAll()`** | `page`, `limit`, `search` (buscar por nombre) |
| 4 | **Swagger decorators** | Documentar todos los endpoints |
| 5 | **ParseMongoIdPipe** | Validar que `:id` sea un ObjectId válido antes de que llegue al service |
| 6 | **Tests unitarios** | `categories.service.spec.ts` — CRUD, no borrar con productos, not found |

**Archivos a crear/modificar:**
```
src/categories/
├── categories.controller.ts        ← Agregar UseGuards, Swagger, paginación, ParseMongoIdPipe
├── categories.service.ts           ← NotFoundException, paginación
├── dto/*.dto.ts                    ← Swagger @ApiProperty()
└── categories.service.spec.ts      ← NUEVO (tests)
```

---

### 0.4 🍕 Módulo `products/` — Arreglos y Mejoras

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | **Renombrar archivo** | `producct.schema.ts` → `product.schema.ts` (typo con doble "c"). Actualizar todos los imports |
| 2 | **NotFoundException** | `findOne`, `update`, `remove` deben lanzar excepción si no existe |
| 3 | **Paginación en `findAll()`** | `page`, `limit`, `search`, `categoryId`, `minPrice`, `maxPrice`, `available` |
| 4 | **Búsqueda por texto** | Índice de texto en `name` y `description` para búsqueda |
| 5 | **Swagger decorators** | Documentar endpoints |
| 6 | **ParseMongoIdPipe** | Validar `:id` |
| 7 | **Tests unitarios** | `products.service.spec.ts` — CRUD, categoría inválida, no borrar con órdenes |

**Archivos a crear/modificar:**
```
src/products/
├── schemas/product.schema.ts       ← RENOMBRAR (era producct.schema.ts) + índice de texto
├── products.module.ts              ← Actualizar import
├── products.controller.ts          ← Swagger, paginación, ParseMongoIdPipe
├── products.service.ts             ← NotFoundException, paginación, búsqueda
├── dto/*.dto.ts                    ← Swagger @ApiProperty()
└── products.service.spec.ts        ← NUEVO (tests)
```

---

### 0.5 🛒 Módulo `cart/` — Arreglos y Mejoras

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | **Crear `RemoveFromCartDto`** | Actualmente `removeProduct` recibe `body: { productId: string }` inline sin DTO. Crear DTO con `@IsMongoId()` |
| 2 | **Validar que el producto no se agregue con cantidad 0 o negativa** | Ya tienes `@Min(1)` en `AddToCartDto` ✅, pero verificar en el service también |
| 3 | **Método `clearCart()`** | Crear método para vaciar el carrito completo (útil post-checkout y para el usuario) |
| 4 | **Endpoint `DELETE /cart/clear`** | Vaciar todo el carrito |
| 5 | **Validar que el producto existe Y está disponible** al agregar | Ya lo haces ✅ — solo agregar Swagger |
| 6 | **Swagger decorators** | Documentar endpoints |
| 7 | **Tests unitarios** | `cart.service.spec.ts` — agregar, remover, carrito vacío, producto no disponible, clear |

**Archivos a crear/modificar:**
```
src/cart/
├── cart.controller.ts              ← Swagger, endpoint clear
├── cart.service.ts                 ← clearCart()
├── dto/
│   ├── add-to-cart.dto.ts          ← Swagger @ApiProperty()
│   └── remove-from-cart.dto.ts     ← NUEVO
└── cart.service.spec.ts            ← NUEVO (tests)
```

---

### 0.6 📦 Módulo `orders/` — Arreglos y Mejoras

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | **Paginación en `findMyOrders()` y `findAllOrders()`** | Con `page`, `limit`, `status`, `dateFrom`, `dateTo` |
| 2 | **Solo el dueño puede cancelar su pedido** | Actualmente solo ADMIN puede cambiar estado. Agregar: el cliente puede cancelar su propio pedido (solo si está en `PENDING`) |
| 3 | **Endpoint `GET /orders/:id`** | Ver detalle de un pedido específico (dueño o ADMIN) |
| 4 | **Vaciar carrito automáticamente** después de crear pedido | Verificar que el carrito queda limpio post-checkout (ya marcas como `CHECKED_OUT`, pero se debería crear uno nuevo `ACTIVE` para el usuario) |
| 5 | **Swagger decorators** | Documentar endpoints con estados posibles |
| 6 | **ParseMongoIdPipe** | Validar `:id` |
| 7 | **UpdateOrderStatusDto en controller** | El endpoint `PATCH :id/status` recibe `body: { status: OrderStatus }` inline. Ya tienes el DTO creado, asegúrate de usarlo en el controller |
| 8 | **Tests unitarios** | `orders.service.spec.ts` — crear desde carrito, carrito vacío, transiciones válidas/inválidas, cancelación por cliente |

**Archivos a crear/modificar:**
```
src/orders/
├── orders.controller.ts            ← Swagger, paginación, usar DTO, ParseMongoIdPipe, GET :id
├── orders.service.ts               ← Paginación, cancelación por cliente, vaciar carrito
├── dto/
│   ├── create-order.dto.ts         ← Swagger @ApiProperty()
│   └── update-order-status.dto.ts  ← Swagger @ApiProperty()
└── orders.service.spec.ts          ← NUEVO (tests)
```

---

### 0.7 🔧 Módulo `common/` — Expandir

Crear utilidades reutilizables que usan todos los módulos.

**Archivos a crear:**
```
src/common/
├── filters/
│   └── http-exception.filter.ts      ← YA EXISTE (mejorar: agregar request ID)
├── pipes/
│   └── parse-mongo-id.pipe.ts        ← NUEVO — Valida ObjectId en todos los :id
├── guards/
│   └── ownership.guard.ts            ← NUEVO — Verifica que req.user === recurso.userId
├── interceptors/
│   └── transform.interceptor.ts      ← NUEVO — Envuelve respuestas: { success, data, meta }
├── dto/
│   └── pagination-query.dto.ts       ← NUEVO — page, limit, sortBy, sortOrder, search
├── interfaces/
│   └── paginated-response.interface.ts  ← NUEVO — { data, meta: { total, page, lastPage } }
├── utils/
│   └── pagination.util.ts            ← NUEVO — Función reutilizable para paginar Mongoose queries
└── middleware/
    └── request-logger.middleware.ts   ← NUEVO — Log de cada HTTP request
```

**`ParseMongoIdPipe`:**
```typescript
// Valida que el parámetro sea un ObjectId válido de MongoDB
// Uso: @Param('id', ParseMongoIdPipe) id: string
import { PipeTransform, BadRequestException } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';

export class ParseMongoIdPipe implements PipeTransform {
  transform(value: string) {
    if (!isValidObjectId(value)) {
      throw new BadRequestException(`"${value}" no es un ID válido`);
    }
    return value;
  }
}
```

**`TransformInterceptor`:**
```typescript
// Envuelve todas las respuestas en formato estándar:
// { success: true, data: { ... }, timestamp: '...' }
```

**`PaginationQueryDto`:**
```typescript
// Reutilizable en todos los findAll():
// GET /products?page=1&limit=10&sortBy=price&sortOrder=desc&search=hamburguesa
```

---

### ✅ Checklist Completo de Fase 0

#### Auth
- [ ] `LoginDto` creado y usado en controller
- [ ] JWT Secret desde `ConfigService` (no hardcodeado)
- [ ] `@Injectable()` en `JwtAuthGuard`
- [ ] Refresh Tokens con rotación
- [ ] Recuperación de contraseña (forgot/reset)
- [ ] Swagger en todos los endpoints
- [ ] Tests unitarios del service

#### Users
- [ ] `select('-password')` en `findAll()`
- [ ] Re-hash de password en `update()`
- [ ] Guard de ownership (`PATCH`, `GET :id`, `DELETE`)
- [ ] `@Roles(ADMIN)` en `DELETE`
- [ ] Validar email duplicado en `update()`
- [ ] No permitir cambio de rol por usuario normal
- [ ] Paginación en `findAll()`
- [ ] Swagger
- [ ] Tests unitarios

#### Categories
- [ ] `@UseGuards(JwtAuthGuard, RolesGuard)` realmente aplicado
- [ ] `NotFoundException` en `findOne`, `update`, `remove`
- [ ] Paginación con búsqueda por nombre
- [ ] `ParseMongoIdPipe` en `:id`
- [ ] Swagger
- [ ] Tests unitarios

#### Products
- [ ] Renombrar `producct.schema.ts` → `product.schema.ts`
- [ ] `NotFoundException` en `findOne`, `update`, `remove`
- [ ] Paginación con filtros (categoría, precio, disponibilidad)
- [ ] Índice de texto para búsqueda
- [ ] `ParseMongoIdPipe` en `:id`
- [ ] Swagger
- [ ] Tests unitarios

#### Cart
- [ ] `RemoveFromCartDto` creado
- [ ] Endpoint `DELETE /cart/clear`
- [ ] Método `clearCart()` en service
- [ ] Swagger
- [ ] Tests unitarios

#### Orders
- [ ] Paginación con filtros (estado, fecha)
- [ ] Cliente puede cancelar su propio pedido (solo en PENDING)
- [ ] `GET /orders/:id` (detalle de un pedido)
- [ ] Usar `UpdateOrderStatusDto` en controller
- [ ] Vaciar carrito automáticamente post-checkout
- [ ] `ParseMongoIdPipe` en `:id`
- [ ] Swagger
- [ ] Tests unitarios

#### Common
- [ ] `ParseMongoIdPipe`
- [ ] `OwnershipGuard`
- [ ] `TransformInterceptor` (respuestas estandarizadas)
- [ ] `PaginationQueryDto` + `PaginatedResponse` + `pagination.util.ts`
- [ ] `RequestLoggerMiddleware`
- [ ] Mejorar `HttpExceptionFilter` (agregar request ID)

---

## 🐳 FASE 1 — Docker Profesional
**Duración:** 1 semana
**Objetivo:** Docker listo para desarrollo y producción.

---

### 1.1 Problemas del Dockerfile Actual

| Problema | Impacto | Solución |
|----------|---------|----------|
| `node:18-alpine` | Node 18 ya es viejo (LTS actual es 20/22) | Usar `node:20-alpine` |
| Corre como `root` | Vulnerabilidad de seguridad en producción | Agregar usuario `node` non-root |
| Sin `HEALTHCHECK` | Docker/ECS no sabe si la app está viva | Agregar `HEALTHCHECK` con `curl` |
| `npm install` en build | Más lento, menos reproducible | Usar `npm ci` (install limpio desde lockfile) |
| Sin labels | No hay metadata de la imagen | Agregar labels OCI estándar |
| Sin `.dockerignore` completo | Puede copiar archivos innecesarios | Mejorar `.dockerignore` |
| Sin señal de shutdown | La app no cierra conexiones limpiamente | Agregar `dumb-init` o `tini` para señales |

### 1.2 Dockerfile Mejorado

```dockerfile
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

# Labels OCI estándar
LABEL org.opencontainers.image.title="Delivery Backend API"
LABEL org.opencontainers.image.description="API RESTful para App Delivery"
LABEL org.opencontainers.image.version="1.0.0"

# Instalar dumb-init y curl (para health check)
RUN apk add --no-cache dumb-init curl

# Crear usuario non-root
USER node

WORKDIR /app

# Copiar solo lo necesario
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node package.json ./

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check (ECS/K8s usan esto)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

# dumb-init como PID 1 para manejo correcto de señales
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

### 1.3 `.dockerignore` Mejorado

```dockerignore
# Dependencias
node_modules
npm-debug.log*

# Build
dist
coverage

# Git
.git
.gitignore

# Docker
Dockerfile*
docker-compose*.yml
.dockerignore

# IDE
.vscode
.idea
*.swp
*.swo

# Entorno
.env
.env.*

# Tests
test
**/*.spec.ts
**/*.test.ts
jest.config.*
jest-e2e.json

# Docs
README.md
docs
CHANGELOG.md
LICENSE
```

### 1.4 Docker Compose — Desarrollo Local

```yaml
# docker-compose.yml
services:
  api:
    build:
      context: ./delivery-backend
      target: builder    # Usa el stage de build, no producción
    ports:
      - '3000:3000'
    env_file: ./delivery-backend/.env
    depends_on:
      mongo:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./delivery-backend/src:/app/src    # Hot reload
    command: npm run start:dev
    restart: unless-stopped

  mongo:
    image: mongo:7
    ports:
      - '27017:27017'
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: admin123
      MONGO_INITDB_DATABASE: delivery
    volumes:
      - mongo-data:/data/db
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh --quiet
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    command: redis-server --maxmemory 128mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

  mongo-express:
    image: mongo-express
    ports:
      - '8081:8081'
    environment:
      ME_CONFIG_MONGODB_ADMINUSERNAME: admin
      ME_CONFIG_MONGODB_ADMINPASSWORD: admin123
      ME_CONFIG_MONGODB_URL: mongodb://admin:admin123@mongo:27017/
    depends_on:
      mongo:
        condition: service_healthy

volumes:
  mongo-data:
```

### 1.5 Docker Compose — Producción

```yaml
# docker-compose.prod.yml
services:
  api:
    build:
      context: ./delivery-backend
      target: production
    ports:
      - '3000:3000'
    env_file: ./delivery-backend/.env.production
    depends_on:
      - mongo
      - redis
    restart: always
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  mongo:
    image: mongo:7
    volumes:
      - mongo-data:/data/db
    restart: always

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru --appendonly yes
    volumes:
      - redis-data:/data
    restart: always

volumes:
  mongo-data:
  redis-data:
```

### ✅ Checklist Fase 1
- [ ] Dockerfile mejorado (Node 20, non-root, healthcheck, dumb-init, npm ci, labels)
- [ ] `.dockerignore` completo
- [ ] `docker-compose.yml` para desarrollo (API + MongoDB + Redis + Mongo Express)
- [ ] `docker-compose.prod.yml` para producción
- [ ] Verificar que `docker compose up` levanta todo correctamente
- [ ] Verificar que hot reload funciona en desarrollo

---

## 📖 FASE 2 — Calidad Global y Observabilidad
**Duración:** 1-2 semanas
**Objetivo:** Logging, health checks, API versioning, validación de entorno.

---

### 2.1 Logging Estructurado con Winston

```bash
npm install winston nest-winston
```

```
src/common/
├── logger/
│   └── winston.config.ts     # Configuración: niveles, formato JSON, transports
├── middleware/
│   └── request-logger.middleware.ts   # Log de cada HTTP request
```

**Cada request logueado:**
```json
{
  "level": "http",
  "timestamp": "2026-08-08T16:30:00.000Z",
  "requestId": "uuid-v4",
  "method": "POST",
  "url": "/api/v1/orders",
  "statusCode": 201,
  "responseTime": "45ms",
  "userId": "64a..."
}
```

### 2.2 Health Checks

```bash
npm install @nestjs/terminus
```

```
src/health/
├── health.module.ts
└── health.controller.ts     # GET /api/v1/health y GET /api/v1/health/ready
```

**Checks:** MongoDB ping, memory heap, disk storage.

### 2.3 API Versioning

En `main.ts`:
```typescript
app.setGlobalPrefix('api/v1');
```

### 2.4 Validación de Variables de Entorno

```bash
npm install joi
```

```typescript
// app.module.ts
ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: Joi.object({
    PORT: Joi.number().default(3000),
    NODE_ENV: Joi.string().valid('development', 'staging', 'production').default('development'),
    MONGO_URI: Joi.string().required(),
    JWT_SECRET: Joi.string().required().min(32),
    JWT_REFRESH_SECRET: Joi.string().required().min(32),
    // ... más variables según avances
  }),
});
```

### 2.5 Swagger / OpenAPI

```bash
npm install @nestjs/swagger swagger-ui-express
```

Configurar en `main.ts` → endpoint `/api/docs`.

### 2.6 CORS Seguro

```typescript
app.enableCors({
  origin: configService.get('ALLOWED_ORIGINS')?.split(',') || '*',
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  credentials: true,
});
```

### 2.7 `.env.example`

Crear archivo template con todas las variables documentadas (sin valores reales):
```env
# Server
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000

# Database
MONGO_URI=mongodb://admin:admin123@localhost:27017/delivery?authSource=admin

# JWT
JWT_SECRET=your_jwt_secret_min_32_chars_here
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
```

### ✅ Checklist Fase 2
- [ ] Winston logging con request logger middleware
- [ ] Health checks (`/api/v1/health`, `/api/v1/health/ready`)
- [ ] Prefijo global `api/v1`
- [ ] Variables de entorno validadas con Joi
- [ ] Swagger configurado en `/api/docs`
- [ ] CORS configurado con origins desde env
- [ ] `.env.example` documentado

---

## 🧪 FASE 3 — Testing Completo + CI
**Duración:** 2 semanas

---

### 3.1 Tests Unitarios

> [!NOTE]
> Si seguiste la Fase 0, ya tienes tests unitarios de cada service. Aquí verificas cobertura y agregas lo que falte.

```bash
npm install --save-dev mongodb-memory-server
```

### 3.2 Tests E2E

```
test/
├── setup.ts                      # MongoDB Memory Server global
├── helpers/
│   ├── auth.helper.ts            # Crear user + obtener token
│   └── test-app.factory.ts       # Crear NestJS app para tests
├── auth.e2e-spec.ts              # Registro → Login → Refresh → Logout
├── users.e2e-spec.ts             # CRUD con ownership
├── products.e2e-spec.ts          # CRUD con paginación
└── cart-orders.e2e-spec.ts       # Flujo completo: carrito → pedido → estados
```

### 3.3 Cobertura > 80%

```json
// package.json
"jest": {
  "coverageThreshold": {
    "global": { "branches": 80, "functions": 80, "lines": 80, "statements": 80 }
  }
}
```

### 3.4 GitHub Actions CI

```
.github/workflows/ci.yml          # Lint → Tests → Coverage en cada push/PR
```

### ✅ Checklist Fase 3
- [ ] Tests unitarios de todos los services (cobertura > 80%)
- [ ] Tests e2e del flujo completo
- [ ] MongoDB Memory Server configurado
- [ ] GitHub Actions corriendo automáticamente

---

## 🔐 FASE 4 — Seguridad Avanzada
**Duración:** 1-2 semanas

---

| # | Tarea |
|---|-------|
| 1 | **Rate limiting granular** — 5 req/min en login, 3/min en registro |
| 2 | **Audit logging** — Interceptor que registra: quién hizo qué, cuándo, desde qué IP |
| 3 | **HTTPS forzado** — Redirect HTTP → HTTPS en producción |
| 4 | **Security headers avanzados** — CSP, X-Content-Type-Options, Referrer-Policy |
| 5 | **Sanitización de inputs** — Prevenir NoSQL injection con `express-mongo-sanitize` |
| 6 | **Límite de tamaño de payload** — `app.use(json({ limit: '10mb' }))` |

```bash
npm install express-mongo-sanitize helmet
```

```
src/common/
├── interceptors/
│   └── audit-log.interceptor.ts    ← NUEVO
```

### ✅ Checklist Fase 4
- [ ] Rate limiting granular por endpoint
- [ ] Audit logging para acciones sensibles
- [ ] `express-mongo-sanitize` aplicado
- [ ] Límite de payload configurado
- [ ] Security headers avanzados

---

## 🍕 FASE 5 — Features Core del Delivery
**Duración:** 3-4 semanas

---

### Módulos Nuevos a Crear

| # | Módulo | Endpoints | Descripción |
|---|--------|-----------|-------------|
| 1 | `uploads/` | POST, DELETE | Subida de imágenes a AWS S3 |
| 2 | `delivery/` | 8 endpoints | Perfil, ubicación, aceptar pedidos, stats |
| 3 | `events/` | WebSocket | Tracking en tiempo real |
| 4 | `mail/` | — (interno) | Emails con AWS SES |
| 5 | `addresses/` | CRUD + default | Direcciones guardadas por usuario |
| 6 | `reviews/` | CRUD | Reseñas (solo pedidos DELIVERED) |
| 7 | `coupons/` | CRUD + apply | Cupones y promociones |
| 8 | `notifications/` | — (interno) | Push notifications con AWS SNS |

**Dependencias nuevas:**
```bash
# AWS
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install @aws-sdk/client-ses
npm install @aws-sdk/client-sns

# Uploads
npm install multer @nestjs/platform-express
npm install --save-dev @types/multer

# WebSockets
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io

# Emails
npm install nodemailer handlebars
npm install --save-dev @types/nodemailer
```

### ✅ Checklist Fase 5
- [ ] Upload de imágenes con S3
- [ ] Módulo de repartidores completo
- [ ] WebSockets para tracking
- [ ] Emails transaccionales con SES
- [ ] Direcciones de entrega
- [ ] Reseñas y calificaciones
- [ ] Cupones y promociones
- [ ] Notificaciones push con SNS

---

## ⚡ FASE 6 — Rendimiento y Escala
**Duración:** 2-3 semanas

---

| # | Tarea | Detalle |
|---|-------|---------|
| 1 | **Cache con Redis** | ElastiCache. Cachear categorías (1h), productos (10min) |
| 2 | **Colas con BullMQ** | Emails, notificaciones, procesamiento de imágenes |
| 3 | **Búsqueda avanzada** | Filtros complejos, índices de MongoDB optimizados |
| 4 | **Dashboard Analytics** | Aggregation pipelines: ventas, top productos, KPIs |
| 5 | **Multi-entorno** | `.env.development`, `.env.staging`, `.env.production` |

```bash
npm install @nestjs/cache-manager cache-manager cache-manager-redis-yet redis
npm install @nestjs/bullmq bullmq
```

### ✅ Checklist Fase 6
- [ ] Redis cache configurado
- [ ] Colas BullMQ funcionando
- [ ] Índices de MongoDB optimizados
- [ ] Dashboard de analytics
- [ ] Archivos de entorno separados

---

## ☁️ FASE 7 — Deploy a Producción con AWS (ECS Fargate)
**Duración:** 2-3 semanas

---

### 🤔 ¿ECS Fargate o Kubernetes? — Mi Recomendación

| Criterio | ECS Fargate | Kubernetes (EKS) |
|----------|-------------|-------------------|
| **Complejidad** | Baja — AWS lo gestiona casi todo | Alta — YAML configs, Helm charts, ingress, networking |
| **Curva de aprendizaje** | 1-2 semanas | 1-3 meses para hacerlo bien |
| **Costo** | ~$15-30/mes para empezar | ~$73/mes solo el control plane de EKS + nodos |
| **Cuándo usarlo** | 1-5 servicios, equipo pequeño | 10+ microservicios, equipos grandes, multi-región |
| **Auto-scaling** | ✅ Integrado | ✅ Más flexible pero más complejo |
| **Para tu caso** | ✅ **RECOMENDADO** | ❌ Overkill por ahora |
| **Para tu carrera** | Excelente en CV | Excelente en CV (pero necesitas dominarlo) |

> [!IMPORTANT]
> **Mi recomendación:** Empieza con **ECS Fargate**. Es más simple, más barato, y resuelve el 100% de lo que necesitas ahora. Kubernetes lo puedes aprender después como Fase 8 opcional, cuando el proyecto crezca a microservicios o necesites multi-región.

### Arquitectura AWS

```
                    ┌─────────────────┐
                    │   Route 53      │  ← DNS: api.tuapp.com
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   CloudFront    │  ← CDN: imágenes desde S3
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   ALB + ACM     │  ← Load Balancer + SSL/TLS
                    │   + WAF         │  ← Firewall
                    └────────┬────────┘
                             │
                ┌────────────▼────────────┐
                │   ECS Fargate           │
                │   ┌──────┐ ┌──────┐    │  ← 2-10 containers
                │   │ Task │ │ Task │    │     (auto-scaling)
                │   └──────┘ └──────┘    │
                └────┬───────────┬───────┘
                     │           │
          ┌──────────▼──┐  ┌────▼─────────┐
          │ DocumentDB   │  │ ElastiCache   │
          │ o Mongo Atlas│  │ (Redis)       │
          └─────────────┘  └──────────────┘
                     │
             ┌───────▼───────┐
             │   S3 Bucket   │  ← Imágenes
             └───────────────┘
```

### Paso a paso

| Paso | Servicio AWS | Qué hacer |
|------|-------------|-----------|
| 1 | **ECR** | Crear repositorio Docker, push de imagen |
| 2 | **VPC** | Crear VPC con subnets públicas (ALB) y privadas (ECS, DB, Redis) |
| 3 | **Security Groups** | ALB (80/443), ECS (3000 desde ALB), DB (27017 desde ECS), Redis (6379 desde ECS) |
| 4 | **DocumentDB o Atlas** | Base de datos MongoDB. Atlas es más barato para empezar |
| 5 | **ElastiCache** | Redis cluster (`cache.t3.micro`) |
| 6 | **S3** | Bucket para imágenes + política de acceso |
| 7 | **CloudFront** | CDN apuntando al bucket S3 |
| 8 | **Secrets Manager** | Guardar MONGO_URI, JWT_SECRET, credenciales AWS |
| 9 | **ECS Cluster** | Crear cluster Fargate |
| 10 | **Task Definition** | Imagen ECR, CPU/RAM, env vars desde Secrets Manager, health check |
| 11 | **ECS Service** | 2 tasks mínimo, auto-scaling 2-10 basado en CPU > 70% |
| 12 | **ACM** | Certificado SSL para `*.tuapp.com` |
| 13 | **ALB** | Load balancer HTTPS con certificado ACM, target group → ECS |
| 14 | **Route 53** | DNS: `api.tuapp.com` → ALB |
| 15 | **SES** | Verificar dominio para envío de emails |
| 16 | **SNS** | Configurar para push notifications |
| 17 | **CloudWatch** | Log groups, métricas, alarmas (CPU > 80%, 5xx > 10/min) |
| 18 | **WAF** | Reglas contra SQL injection, XSS, rate limiting por IP, geo-blocking |
| 19 | **CloudTrail** | Auditoría de acciones en AWS |
| 20 | **Backups** | Snapshots automáticos de DB |
| 21 | **IAM** | Roles con permisos mínimos por servicio |

### CI/CD con GitHub Actions

```
.github/workflows/deploy.yml
```

**Flujo:**
```
git push main → Lint → Tests → Build Docker → Push ECR → Deploy ECS → Zero-downtime rollout
```

### 💰 Costos Estimados

| Servicio | Config | Costo/mes |
|----------|--------|-----------|
| ECS Fargate | 2 tasks × 0.25 vCPU × 512MB | ~$15 |
| Atlas M10 (o DocumentDB) | MongoDB | ~$30-55 |
| ElastiCache | cache.t3.micro | ~$12 |
| ALB | 1 load balancer | ~$16 |
| S3 | 10 GB | ~$0.25 |
| CloudFront | 50 GB transfer | ~$5 |
| Route 53 | 1 zona | ~$0.50 |
| CloudWatch | Logs + métricas | ~$5 |
| SES | 1,000 emails | ~$0.10 |
| **Total** | | **~$85-110/mes** |

> [!TIP]
> **Para empezar barato:** Usa MongoDB Atlas (free tier o M10 ~$30) en vez de DocumentDB ($55), y un solo task ECS. Costo: ~$60/mes.

### ✅ Checklist Fase 7
- [ ] ECR repository + Docker image publicada
- [ ] VPC con subnets públicas/privadas
- [ ] Security groups configurados
- [ ] MongoDB (Atlas o DocumentDB) con acceso seguro
- [ ] ElastiCache Redis
- [ ] S3 bucket + CloudFront CDN
- [ ] Secrets en Secrets Manager
- [ ] ECS Fargate cluster + service (2 tasks)
- [ ] ACM certificado SSL
- [ ] ALB con HTTPS
- [ ] Route 53 DNS
- [ ] SES verificado
- [ ] CloudWatch logs + alarmas
- [ ] WAF configurado
- [ ] CI/CD con GitHub Actions
- [ ] Auto-scaling (2-10 tasks)
- [ ] IAM roles con permisos mínimos
- [ ] Backups automáticos

---

## 🎓 FASE 8 (OPCIONAL) — Kubernetes
**Duración:** 3-4 semanas
**Cuándo hacerla:** Solo si necesitas multi-región, tienes 5+ microservicios, o quieres aprenderlo para tu carrera.

---

> [!NOTE]
> Esta fase es **100% opcional**. ECS Fargate cubre todo lo que necesitas. Kubernetes es para cuando el proyecto crezca significativamente o quieras sumarlo a tu perfil profesional.

### ¿Qué aprenderías?

| Concepto | Para qué sirve |
|----------|----------------|
| Pods, Deployments, Services | Cómo K8s organiza containers |
| Ingress Controller (NGINX) | Enrutar tráfico HTTP/HTTPS |
| ConfigMaps y Secrets | Variables de entorno en K8s |
| Helm Charts | Paquetes reutilizables de K8s |
| HPA (Horizontal Pod Autoscaler) | Auto-scaling basado en CPU/RAM |
| Namespaces | Separar staging/production |
| Persistent Volumes | Almacenamiento persistente |

### Archivos que crearías

```
k8s/
├── namespace.yml
├── deployment.yml              # Pods de la API
├── service.yml                 # ClusterIP service
├── ingress.yml                 # NGINX Ingress con SSL
├── hpa.yml                     # Auto-scaling
├── configmap.yml               # Variables no sensibles
├── secrets.yml                 # Variables sensibles (encriptadas)
├── mongo-statefulset.yml       # MongoDB en K8s (o usar Atlas)
├── redis-deployment.yml        # Redis en K8s (o usar ElastiCache)
└── helm/
    └── delivery-backend/       # Helm chart completo
        ├── Chart.yaml
        ├── values.yaml
        ├── values.staging.yaml
        ├── values.production.yaml
        └── templates/
            ├── deployment.yaml
            ├── service.yaml
            ├── ingress.yaml
            └── hpa.yaml
```

### Opciones de Kubernetes en AWS

| Opción | Costo | Complejidad |
|--------|-------|-------------|
| **EKS (Elastic Kubernetes Service)** | $73/mes control plane + nodos | Media-Alta |
| **EKS con Fargate** | $73/mes + pago por pod | Media |
| **k3s en EC2** | Solo costo de EC2 (~$10-30/mes) | Alta (self-managed) |

---

## 📊 Resumen Final — Todas las Fases

| Fase | Qué | Duración | Acumulado |
|------|-----|----------|-----------|
| **0** | Blindar 7 módulos existentes | 2-3 sem | 3 sem |
| **1** | Docker profesional | 1 sem | 4 sem |
| **2** | Calidad y observabilidad | 1-2 sem | 6 sem |
| **3** | Testing completo + CI | 2 sem | 8 sem |
| **4** | Seguridad avanzada | 1-2 sem | 10 sem |
| **5** | Features core (11 módulos nuevos) | 3-4 sem | 14 sem |
| **6** | Rendimiento y escala | 2-3 sem | 17 sem |
| **7** | Deploy AWS con ECS Fargate | 2-3 sem | **20 sem** |
| **8** | *(Opcional)* Kubernetes | 3-4 sem | 24 sem |

### Evolución del Proyecto

| Métrica | Hoy | Post Fase 0-7 |
|---------|-----|---------------|
| Módulos | 7 | 18+ |
| Endpoints | ~15 | 70+ |
| Tests | ~0% | > 80% cobertura |
| Docker | Básico | Multi-stage, non-root, healthcheck, compose |
| Documentación | README | Swagger interactivo |
| Logging | ❌ | Winston estructurado |
| Monitoreo | ❌ | CloudWatch + alarmas |
| CI/CD | ❌ | GitHub Actions → ECR → ECS |
| Seguridad | Básica | Hardened (WAF, audit, refresh tokens) |
| Infraestructura | Local | AWS producción (ECS, ALB, S3, CloudFront) |

---

> [!IMPORTANT]
> **El orden importa.** Fase 0 primero (blindar lo existente), luego Docker, luego calidad, luego tests, y así sucesivamente. Cada fase construye sobre la anterior. Si estás listo, arrancamos con la **Fase 0 módulo por módulo**. 🚀
