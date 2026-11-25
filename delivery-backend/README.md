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
├── orders/                     # Creación, consulta y cambio de estados de pedidos
├── addresses/                  # Direcciones de envío por usuario
├── uploads/                    # Subida de imágenes a AWS S3
├── payments/                   # Pasarela de pagos MercadoPago + webhook
├── mail/ · sms/ · notifications/ # Correos SMTP (Nodemailer), SMS OTP (Twilio Verify/SMS) y push (FCM)
├── delivery/                   # Perfil y gestión de repartidores
├── events/                     # WebSockets (Socket.io) para tracking en tiempo real
├── reviews/                    # Reseñas y calificaciones de productos
├── coupons/                    # Cupones y códigos promocionales
├── queues/                     # Colas en segundo plano con BullMQ y Redis
└── analytics/                  # Dashboard de KPIs, ventas y top productos (Aggregation Pipelines)
```

---

## 🔐 Seguridad y Funcionalidades Principales

### 1. Autenticación y Autorización (RBAC)
- Encriptación segura de contraseñas con `bcrypt`.
- Emisión y validación de tokens JWT mediante `JwtAuthGuard` y `JwtStrategy`.
- Decorador personalizado `@Roles()` y `RolesGuard` para proteger rutas según el rol (`ADMIN`, `CLIENT`, `DELIVERY`).

### 2. Protección & Rate Limiting
- **Helmet:** Encabezados de seguridad HTTP habilitados.
- **Throttler Guard:** Protección anti-fuerza bruta con límite global de **100 peticiones por minuto** y límites estrictos en endpoints sensibles de Auth (`3–5 req/min`).
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
| `POST` | `/auth/register` | Pública | Registrar cliente (`CLIENT`) con celular obligatorio y enviar código OTP de 6 dígitos por correo SMTP o SMS (`verificationChannel: 'email' \| 'sms'`) |
| `POST` | `/auth/verify-email` | Pública | Verificar cuenta por código de 6 dígitos (`{ email, code }` o `{ phone, code }`), Twilio Verify o enlace (`{ token }`) y emitir JWTs (`isPhoneVerified: true` en SMS) |
| `POST` | `/auth/resend-verification` | Pública | Reenviar código de 6 dígitos permitiendo elegir canal (`email` o `sms`) |
| `POST` | `/auth/login` | Pública | Iniciar sesión y obtener `access_token` + `refresh_token` (requiere correo verificado) |
| `POST` | `/auth/refresh` | Pública | Rotar `refresh_token` y emitir nuevo `access_token` |
| `POST` | `/auth/logout` | Pública | Invalidar `refresh_token` activo |
| `POST` | `/auth/forgot-password` | Pública | Enviar enlace seguro de recuperación de contraseña por correo SMTP real (expira en 15 min, sin `devToken`) |
| `POST` | `/auth/reset-password` | Pública | Restablecer contraseña con el token recibido en el enlace del correo |
| `POST` | `/auth/google` | Pública | Iniciar sesión, registrarse o vincular cuenta automáticamente con Google OAuth 2.0 |
| `POST` | `/auth/facebook` | Pública | Iniciar sesión, registrarse o vincular cuenta automáticamente con Facebook OAuth 2.0 |
| `POST` | `/auth/link/google` | JWT | Vincular cuenta de Google al perfil del usuario autenticado |
| `POST` | `/auth/link/facebook` | JWT | Vincular cuenta de Facebook al perfil del usuario autenticado |
| `DELETE` | `/auth/unlink/:provider` | JWT | Desvincular Google o Facebook (valida que quede al menos un método de acceso activo) |

### 👤 Usuarios (`/users`)
| Método | Endpoint | Protección | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/users` | Pública | Registro de nuevos usuarios |
| `GET` | `/users` | JWT + Admin | Obtener lista completa de usuarios |
| `GET` | `/users/:id` | JWT | Obtener detalles de un usuario |
| `PATCH` | `/users/:id` | JWT | Actualizar datos del usuario (`name`, `email`, `phone`, `password`, `avatarUrl`) |
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
| `POST` | `/products` | JWT + Admin | Crear un nuevo producto con precio de venta, `costPrice` (costo de compra), `stock`, `lowStockThreshold` y disponibilidad automática |
| `PATCH` | `/products/:id` | JWT + Admin | Actualizar producto, stock y costo (marca `available: false` automáticamente si `stock === 0`, rechaza activar con stock `0`) |
| `DELETE` | `/products/:id` | JWT + Admin | Eliminar un producto |

### 🛒 Carrito de Compras (`/cart`)
| Método | Endpoint | Protección | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/cart` | JWT | Obtener el carrito del usuario autenticado |
| `POST` | `/cart/add` | JWT | Agregar producto al carrito (valida stock disponible) |
| `PATCH` | `/cart/item` | JWT | Actualizar cantidad exacta de un producto en el carrito (`0` lo elimina; valida stock al incrementar) |
| `DELETE` | `/cart/remove` | JWT | Eliminar producto específico del carrito |
| `DELETE` | `/cart/clear` | JWT | Vaciar el carrito completo |

### 📦 Pedidos (`/orders`)
| Método | Endpoint | Protección | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/orders` | JWT | Crear pedido a partir del carrito actual (exige celular `PHONE_REQUIRED`, soporta `couponCode`, `paymentMethod: 'MERCADOPAGO' \| 'CASH_ON_DELIVERY'`, `cashAmountGiven` con cálculo de `changeDue` y beneficio `-10%` Rider máx. 4/mes) |
| `GET` | `/orders/rider-discount-quota` | JWT | Consultar el cupo mensual restante del beneficio `-10%` para repartidores |
| `GET` | `/orders/me` | JWT | Historial de pedidos del cliente (paginado, con filtros) |
| `GET` | `/orders/:id` | JWT | Ver detalle de un pedido (dueño o Admin) |
| `POST` | `/orders/:id/pay` | JWT | Generar URL de MercadoPago Checkout Pro (bloqueado para órdenes `CASH_ON_DELIVERY`) |
| `POST` | `/orders/:id/verify-payment` | JWT | Verificar el estado real de un pago de MercadoPago (`paymentId`) con validación anti-fraude de `external_reference` e idempotencia |
| `PATCH` | `/orders/:id/cancel` | JWT | Cancelar un pedido propio (solo en estado `PENDING`, restaurando stock y cupón) |
| `GET` | `/orders` | JWT + Admin | Ver todos los pedidos (paginado, con filtros) |
| `PATCH` | `/orders/:id/status` | JWT + Admin | Cambiar estado del pedido (permite `PENDING → CONFIRMED` directo para `CASH_ON_DELIVERY`, marca `paymentStatus = PAID` al entregar en efectivo y exige `deliveryId` con rol `DELIVERY` al despachar) |

### 💳 Pagos (`/payments`)
| Método | Endpoint | Protección | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/payments/webhook` | Pública | Webhook de MercadoPago (soporta Webhooks v2 `body.data.id` e IPN `query`), verifica contra API real, aplica idempotencia y emite actualización por WebSocket |
| `GET` | `/payments/success` | Pública | Sincroniza el pago si llega `payment_id`/`collection_id` y redirige (`302`) a `FRONTEND_URL/payments/success` |
| `GET` | `/payments/failure` | Pública | Sincroniza el pago si llega `payment_id`/`collection_id` y redirige (`302`) a `FRONTEND_URL/payments/failure` |
| `GET` | `/payments/pending` | Pública | Sincroniza el pago si llega `payment_id`/`collection_id` y redirige (`302`) a `FRONTEND_URL/payments/pending` |

### ⭐ Reseñas (`/reviews`)
| Método | Endpoint | Protección | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/reviews` | JWT | Crear reseña (solo pedidos propios en estado `DELIVERED`) |
| `GET` | `/reviews/product/:productId` | Pública | Listar reseñas de un producto |
| `DELETE` | `/reviews/:id` | JWT | Eliminar reseña (autor o Admin) |

### 🎟️ Cupones (`/coupons`)
| Método | Endpoint | Protección | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/coupons` | JWT + Admin | Crear cupón (`PERCENTAGE` o `FIXED`) |
| `GET` | `/coupons` | JWT + Admin | Listar todos los cupones |
| `GET` | `/coupons/:id` | JWT + Admin | Ver detalle de un cupón |
| `PATCH` | `/coupons/:id` | JWT + Admin | Actualizar un cupón |
| `DELETE` | `/coupons/:id` | JWT + Admin | Eliminar un cupón |
| `POST` | `/coupons/apply` | JWT | Previsualizar y validar un cupón promocional sobre el total del pedido (se redime al crear la orden en `POST /orders`) |

### 🛵 Repartidores (`/delivery`)
| Método | Endpoint | Protección | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/delivery/profile` | JWT (`CLIENT`/`DELIVERY`) | Enviar solicitud de perfil de repartidor (inicia en `PENDING` hasta aprobación de Admin; permite re-postular si fue `REJECTED`) |
| `GET` | `/delivery/profile` | JWT (`CLIENT`/`DELIVERY`) | Consultar mi perfil o estado de solicitud de repartidor |
| `GET` | `/delivery/profiles` | JWT + Admin | Listar solicitudes y perfiles de repartidores (filtro opcional `?status=PENDING\|APPROVED\|REJECTED`) |
| `PATCH` | `/delivery/profiles/:id/status` | JWT + Admin | Aprobar o rechazar solicitud de repartidor (promueve `CLIENT → DELIVERY` al aprobar) |
| `PATCH` | `/delivery/availability` | JWT + Delivery | Cambiar estado de disponibilidad Online/Offline (requiere perfil `APPROVED`) |
| `PATCH` | `/delivery/location` | JWT + Delivery | Actualizar coordenadas GPS y emitir `delivery_location_updated` al cliente en tiempo real |
| `GET` | `/delivery/orders/available` | JWT + Delivery | Listar pedidos en estado `PREPARING` sin repartidor asignado (con `phone` del cliente) |
| `GET` | `/delivery/orders/active` | JWT + Delivery | Listar pedidos actualmente en camino (`OUT_FOR_DELIVERY`) del repartidor (con `phone` del cliente) |
| `GET` | `/delivery/orders/history` | JWT + Delivery | Historial paginado (`?page=&limit=`) de entregas completadas con ganancia exacta basada en el costo de envío (`deliveryFee`) |
| `PATCH` | `/delivery/orders/:id/accept` | JWT + Delivery | Aceptar pedido disponible (exige `isAvailable === true`), pasa a `OUT_FOR_DELIVERY` y emite `order_taken` |
| `PATCH` | `/delivery/orders/:id/deliver` | JWT + Delivery | Marcar pedido como `DELIVERED` (si es `CASH_ON_DELIVERY`, marca `paymentStatus = PAID` y `paidAt`) |
| `GET` | `/delivery/stats` | JWT + Delivery | Métricas del repartidor (`delivered`, `inProgress`, `deliveredToday`, `todayEarnings`, `estimatedEarnings` basados exclusivamente en `deliveryFee`) |

### 📊 Analytics (`/analytics`)
| Método | Endpoint | Protección | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/analytics/dashboard` | JWT + Admin | KPIs financieros reales del período (ingresos, costo de compra COGS, ganancia neta real, margen %, valoración de inventario), bloque `carryOver` (arrastre de déficit mensual previo, pedidos pendientes de cobro previos e inventario vigente), `inventoryAlerts` y órdenes por estado (acepta `?month=YYYY-MM`, `?days=` o `?from=&to=`) |
| `GET` | `/analytics/top-products` | JWT + Admin | Ranking de productos con unidades vendidas, ingresos, costo de compra, ganancia real, margen % y stock actual (acepta `?limit=&month=YYYY-MM&days=&from=&to=`) |
| `GET` | `/analytics/sales` | JWT + Admin | Serie histórica diaria de pedidos, unidades, ventas, costo de compra y ganancia neta real (acepta `?month=YYYY-MM`, `?days=` o `?from=&to=`) |

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

- ✅ **Fase 0.1 (Auth)**: Autenticación JWT, Refresh Tokens, verificación de correo electrónico por SMTP real (código OTP de 6 dígitos + enlace con TTL de 15 min), inicio de sesión y vinculación de cuentas con Google y Facebook OAuth 2.0 y flujos de recuperación de contraseñas.
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

- ✅ **Fase 5 (Nuevos Módulos Core)**:
  - ✅ **Addresses**: Direcciones de envío.
  - ✅ **Uploads**: Subida de imágenes a AWS S3 con validación de firma binaria (*magic bytes*), borrado automático de archivos previos (`deleteFile`) y soporte `AWS_CLOUDFRONT_DOMAIN`.
  - ✅ **Payments (MercadoPago + Efectivo Contraentrega)**: `PaymentsService` y `PaymentsController` con fix para `localhost`, soporte de Webhooks v2/IPN, validación anti-fraude de `external_reference`, idempotencia, emisión WebSocket, redirecciones `302` a `FRONTEND_URL`, verificación explícita (`POST /orders/:id/verify-payment`) y flujo completo de pago en efectivo contraentrega (`CASH_ON_DELIVERY`) con vueltas y cobro automático al entregar.
  - ✅ **Notifications & Mail**: Sistema asíncrono para enviar push notifications (FCM) y correos (Nodemailer) en cada actualización de estado del pedido.
  - ✅ **Delivery**: Módulo completo para repartidores con aprobación Admin (`PENDING`/`APPROVED`/`REJECTED`), validación de disponibilidad al aceptar pedidos, geolocalización en vivo, teléfono del cliente en ruta, cobro contraentrega al entregar, métricas ampliadas + historial paginado (`GET /delivery/orders/history`) y descuento mensual del 10% en sus primeros 4 pedidos como cliente.
  - ✅ **Events**: Integración de WebSockets (`socket.io`) para emitir cambios de estado (`order_status_updated`), ubicación del repartidor (`delivery_location_updated`) y alertas en vivo de pedidos disponibles (`new_available_order` / `order_taken` en sala `riders_available`, consumidas en tiempo real por el Rider Portal en `DeliveryLayout`).
  - ✅ **Reviews**: Reseñas con validación de pedido `DELIVERED`, verificación de que el producto pertenece a la orden, índice único `{ user, product, order }` y moderación por Admin.
  - ✅ **Coupons**: CRUD de cupones (Admin) y endpoint `apply` con validación de expiración, límite de usos, uso único por usuario, monto mínimo y tope de descuento.
  - ✅ **CI**: Specs de todos los módulos con mocks completos; **19 suites / 183 tests unitarios** (incluyendo `payments.service.spec.ts`) + E2E pasando y `nest build` verificado.

- ✅ **Fase 6 (Rendimiento y Escala)**:
  - ✅ **Cache con Redis**: `@nestjs/cache-manager` + `@keyv/redis` en Categorías (TTL 1h) y Productos (TTL 10min).
  - ✅ **Colas con BullMQ**: `QueuesModule` (`QueuesService` + `NotificationsProcessor`) para envío asíncrono de emails y push notifications con 3 reintentos exponenciales.
  - ✅ **Búsqueda Avanzada e Índices**: Índices compuestos en `ProductSchema` y `OrderSchema` + ordenamiento dinámico (`sortBy`, `sortOrder`).
  - ✅ **Dashboard Analytics**: Endpoints de KPIs, ventas diarias y top productos mediante Aggregation Pipelines de MongoDB.
  - ✅ **Multi-entorno**: Soporte para `.env.development`, `.env.staging` y `.env.production`.

*Siguiente paso: Fase 7 — Deploy a Producción con AWS (ECS Fargate).*
