# 📦 App Delivery – Backend API

API RESTful completa para la plataforma de **App Delivery**, desarrollada con **NestJS (v11)**, **TypeScript**, **MongoDB** y **Mongoose**. Sigue una arquitectura modular, limpia y robusta, con seguridad por roles, autenticación JWT, limitación de tasa (rate limiting) y soporte para Docker.

---

## 🚀 Tecnologías Utilizadas

- **Framework Core:** NestJS (v11) & Node.js
- **Base de Datos:** MongoDB / Mongoose (v9)
- **Autenticación & Encriptación:** JWT (`@nestjs/jwt`, `passport-jwt`) & `bcrypt`
- **Autorización:** Control de Acceso Basado en Roles (RBAC: `ADMIN`, `CLIENT`, `DELIVERY`)
- **Validación de Datos:** `class-validator` & `class-transformer` (ValidationPipe estricto)
- **Seguridad:** `helmet` (HTTP Headers) & `@nestjs/throttler` (Rate Limiting)
- **Logging:** `winston` + `nest-winston` (logs estructurados en JSON con trazabilidad)
- **Observabilidad:** `@nestjs/terminus` (Health Checks de MongoDB y memoria)
- **Documentación:** `@nestjs/swagger` (Swagger UI en `/api/docs`)
- **Validación de Entorno:** `joi` (valida `.env` al arranque)
- **Manejo de Errores:** Filtro global de excepciones personalizado (`HttpExceptionFilter`)
- **Contenedorización:** Docker & Docker Compose

---

## 📁 Arquitectura del Proyecto

El proyecto sigue una arquitectura modular en NestJS con separación clara de responsabilidades:

```text
src/
├── main.ts                     # Punto de entrada (Pipes globales, Helmet, CORS, Throttler)
├── app.module.ts               # Módulo raíz e integración de Mongoose & ConfigModule
├── common/                     # Utilidades compartidas y filtros globales de excepciones
├── auth/                       # Autenticación JWT, Estrategia Passport, Guards y Roles
├── users/                      # Gestión de usuarios, esquemas y DTOs
├── categories/                 # Categorías de productos
├── products/                   # Catálogo de productos
├── cart/                       # Carrito de compras persistente por usuario
└── orders/                     # Creación, consulta y cambio de estados de pedidos
```

---

## 🔐 Seguridad y Funcionalidades Principales

### 1. Autenticación y Autorización (RBAC)
- Encriptación segura de contraseñas con `bcrypt`.
- Emisión y validación de tokens JWT mediante `JwtAuthGuard` y `JwtStrategy`.
- Decorador personalizado `@Roles()` y `RolesGuard` para proteger rutas según el rol (`ADMIN`, `CLIENT`, `DELIVERY`).

### 2. Protección & Rate Limiting
- **Helmet:** Encabezados de seguridad HTTP habilitados.
- **Throttler Guard:** Protección anti-fuerza bruta (Límite: 10 peticiones por minuto por cliente).
- **ValidationPipe Global:** Limpieza estricta de payloads (`whitelist`, `forbidNonWhitelisted`, `transform`).

---

## 📡 Módulos y Endpoints de la API

### 💉 Observabilidad (`/health`)
| Método | Endpoint | Protección | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Pública | Estado del servidor: MongoDB y memoria heap |
| `GET` | `/api/docs` | Pública | Documentación interactiva Swagger UI |

### 🔑 Autenticación (`/auth`)
| Método | Endpoint | Protección | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Pública | Iniciar sesión y obtener el token JWT |

### 👤 Usuarios (`/users`)
| Método | Endpoint | Protección | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/users` | Pública | Registro de nuevos usuarios |
| `GET` | `/users` | JWT + Admin | Obtener lista completa de usuarios |
| `GET` | `/users/:id` | JWT | Obtener detalles de un usuario |
| `PATCH` | `/users/:id` | JWT | Actualizar datos del usuario |
| `DELETE` | `/users/:id` | JWT + Admin | Eliminar un usuario |

### 🏷️ Categorías (`/categories`)
| Método | Endpoint | Protección | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/categories` | Pública | Obtener todas las categorías |
| `GET` | `/categories/:id` | Pública | Obtener categoría por ID |
| `POST` | `/categories` | JWT + Admin | Crear nueva categoría |
| `PATCH` | `/categories/:id` | JWT + Admin | Editar categoría existente |
| `DELETE` | `/categories/:id` | JWT + Admin | Eliminar categoría |

### 🍕 Productos (`/products`)
| Método | Endpoint | Protección | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/products` | Pública | Listar todos los productos del catálogo |
| `GET` | `/products/:id` | Pública | Obtener detalles de un producto |
| `POST` | `/products` | JWT + Admin | Crear un nuevo producto |
| `PATCH` | `/products/:id` | JWT + Admin | Actualizar un producto |
| `DELETE` | `/products/:id` | JWT + Admin | Eliminar un producto |

### 🛒 Carrito de Compras (`/cart`)
| Método | Endpoint | Protección | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/cart` | JWT | Obtener el carrito del usuario autenticado |
| `POST` | `/cart/add` | JWT | Agregar/actualizar producto en el carrito |
| `DELETE` | `/cart/remove` | JWT | Eliminar producto específico del carrito |
| `DELETE` | `/cart/clear` | JWT | Vaciar el carrito completo |

### 📦 Pedidos (`/orders`)
| Método | Endpoint | Protección | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/orders` | JWT | Crear pedido a partir del carrito actual |
| `GET` | `/orders/me` | JWT | Historial de pedidos del cliente (paginado, con filtros) |
| `GET` | `/orders/:id` | JWT | Ver detalle de un pedido (dueño o Admin) |
| `PATCH` | `/orders/:id/cancel` | JWT | Cancelar un pedido propio (solo en estado `PENDING`) |
| `GET` | `/orders` | JWT + Admin | Ver todos los pedidos (paginado, con filtros) |
| `PATCH` | `/orders/:id/status` | JWT + Admin | Cambiar estado del pedido (`PENDING` → `CONFIRMED` → `PREPARING` → `OUT_FOR_DELIVERY` → `DELIVERED` / `CANCELLED`) |

---

## ⚙️ Configuración y Variables de Entorno

Copia el archivo `.env.example` en la raíz del backend y configura tus valores:

```bash
cp .env.example .env
```

```env
# Server
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4200

# Database
MONGO_URI=mongodb://admin:admin123@localhost:27017/delivery?authSource=admin

# JWT
JWT_SECRET=your_super_secret_key_minimum_32_characters_here
JWT_REFRESH_SECRET=your_refresh_secret_minimum_32_characters
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
```

> Si falta alguna variable requerida, la aplicación **no arrancará** y te indicará exactamente cuál falta (validado con `Joi`).

---

## 🛠️ Instalación y Ejecución

### Desarrollo con Docker (Recomendado)

```bash
# Desde la raíz del proyecto (donde está docker-compose.yml)

# 1. Levantar todos los servicios
docker compose up -d

# 2. Ver logs de la API en tiempo real
docker compose logs -f api

# 3. Reconstruir solo si cambió el package.json
docker compose up -d --build api
```

### URLs disponibles en desarrollo
| Servicio | URL |
|----------|-----|
| API REST | `http://localhost:3000/api/v1` |
| Swagger UI | `http://localhost:3000/api/docs` |
| Health Check | `http://localhost:3000/api/v1/health` |
| Mongo Express | `http://localhost:8081` |

---

## 📌 Estado del Proyecto (Progreso Real)

- ✅ **Fase 0.1 (Auth)**: Autenticación JWT, Refresh Tokens, y flujos de recuperación de contraseñas.
- ✅ **Fase 0.2 (Users)**: CRUD de usuarios con validaciones de email duplicado, Ownership Guards, prevención de Inyección de Roles, paginación (`PaginationQueryDto`) y documentación en Swagger.
- ✅ **Fase 0.3 (Categories)**: Endpoints protegidos, manejo de excepciones (`NotFoundException`), validación de Mongo IDs con `ParseMongoIdPipe`, paginación y Tests Unitarios.
- ✅ **Fase 0.4 (Products)**: Índices de texto y búsqueda avanzada, paginación con filtros (`ProductPaginationDto`), validaciones y Tests Unitarios.
- ✅ **Fase 0.5 (Cart)**: Carrito de compras con endpoints documentados, validación de cantidad y tests unitarios de cobertura completa.
- ✅ **Fase 0.6 (Orders)**: Paginación con filtros (estado y fechas), detalle de pedido protegido (`GET /orders/:id`), cancelación por cliente (`PATCH /orders/:id/cancel`), vaciado automático del carrito post-checkout, `ParseMongoIdPipe`, Swagger y 14 Tests Unitarios.
- ✅ **Fase 0.7 (Common)**: `TransformInterceptor` global (contrato `{ success, data, timestamp }`), `HttpExceptionFilter` con `requestId` para trazabilidad, `RequestLoggerMiddleware` para observabilidad, `PaginatedResponse<T>` interface y `paginate()` helper reutilizable.
- ✅ **Fase 1 (Docker)**: Multi-stage Dockerfile (node:20-alpine, non-root, dumb-init, healthcheck), `.dockerignore` optimizado, y Compose diferenciado para desarrollo y producción.
- ✅ **Fase 2 (Calidad Global y Observabilidad)**: Logging estructurado con Winston, Health Checks con Terminus, API Versioning (`api/v1`), validación de `.env` con Joi, Swagger UI en `/api/docs`, CORS configurado y `.env.example` documentado.
- ✅ **Fase 3 (Testing e Integración Continua)**: Configuración de Jest ignorando dependencias sin lógica (80.06% de cobertura global superado), integración de `mongodb-memory-server` para E2E y pipeline activo en GitHub Actions.
- ✅ **Fase 4 (Seguridad Avanzada)**: Rate Limiting granular (`@Throttle`), Audit Logs mediante interceptor global, Sanitización estricta (`express-mongo-sanitize`) contra NoSQL Injection, protección de payload (10mb) y seguridad condicional (Helmet estricto y Swagger oculto en producción).

*Siguiente paso: Fase 5 — Refinamiento y Optimización.*
