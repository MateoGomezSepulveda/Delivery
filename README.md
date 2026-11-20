# 🚚 App Delivery - Proyecto Principal

Bienvenido al repositorio principal de la plataforma **App Delivery**. Este proyecto está diseñado con una arquitectura moderna, segura y escalable orientada a módulos desacoplados, enfocado en las mejores prácticas de desarrollo de software.

---

## 📁 Estructura del Repositorio

- **`delivery-backend/`**: Servidor API RESTful principal. Construido con **NestJS 11**, **MongoDB**, **Mongoose** y contenedorizado con **Docker**. Contiene toda la lógica de negocio, reglas de seguridad y autenticación. Consulta su documentación completa en el [README del backend](./delivery-backend/README.md).
- **`delivery-frontend/`**: Aplicación web Multi-Rol (**Cliente**, **Repartidor** y **Administrador**) construida con **React 18**, **TypeScript**, **Vite**, **Tailwind CSS**, **TanStack Query v5** y **Zustand** bajo el sistema de diseño `ui-ux-pro-max`. Consulta su documentación en el [README del frontend](./delivery-frontend/README.md).
- **`docs/`**: Documentación adicional de la arquitectura, roadmaps ([Backend](./docs/roadmap%20backend%20delivery.md) y [Frontend](./docs/roadmap%20frontend%20delivery.md)) e infraestructura del proyecto.
- **`STATUS.md`**: Archivo de seguimiento en tiempo real que documenta el progreso actual, fases completadas y siguientes pasos del desarrollo.

---

## 🔐 Enfoque en la Seguridad ("Secure by Design")

Este proyecto ha sido construido priorizando la seguridad en cada capa:

- **Autenticación Robusta**: Implementación de JWT (JSON Web Tokens) con soporte para Refresh Tokens y flujos seguros de recuperación de contraseñas. Cifrado de contraseñas utilizando `bcrypt`.
- **Autorización (RBAC y Ownership)**: Control de Acceso Basado en Roles (Admin, Client, Delivery). Implementación de `OwnershipGuard` para asegurar que los usuarios solo puedan acceder y modificar sus propios recursos.
- **Protección contra Inyecciones**: Uso de `ValidationPipe` estricto (`whitelist`, `forbidNonWhitelisted`) para sanitizar todas las entradas, previniendo ataques de inyección NoSQL y elevación de privilegios (Role Injection).
- **Defensas de Red y HTTP**: 
  - **Helmet**: Configuración de cabeceras HTTP seguras para proteger contra vulnerabilidades web comunes.
  - **Rate Limiting (Throttler)**: Prevención de ataques de fuerza bruta limitando la tasa de peticiones.
- **Validación Estricta**: Uso de DTOs con `class-validator` para asegurar que la información entrante cumple siempre con el formato esperado.

---

## 🚀 Progreso Actual (Fases Completadas)

Las siguientes fases centrales ya están implementadas y probadas (con Tests Unitarios exitosos):

- ✅ **Fase 0.1 (Auth)**: 
  - Login seguro, emisión de Access y Refresh Tokens.
  - Endpoints protegidos y recuperación de contraseñas.
- ✅ **Fase 0.2 (Users)**: 
  - Gestión completa de usuarios y validación de email duplicado.
  - Paginación de resultados con `PaginationQueryDto`.
  - Documentación interactiva completa con Swagger.
  - Prevención de inyección de roles a nivel de creación y actualización.
- ✅ **Fase 0.3 (Categories)**:
  - Rutas de lectura públicas y operaciones protegidas con Guards.
  - Paginación y búsqueda por nombre.
  - `ParseMongoIdPipe` para validación de IDs.
  - Documentación en Swagger y Tests Unitarios completados.
- ✅ **Fase 0.4 (Products)**:
  - Índices de texto en MongoDB para búsquedas full-text.
  - Paginación compleja con filtros múltiples (rango de precios, categoría, disponibilidad).
  - Validaciones robustas (`NotFoundException`, `ParseMongoIdPipe`).
  - Documentación en Swagger y Tests Unitarios completados.
- ✅ **Fase 0.5 (Cart)**:
  - Validaciones estrictas de cantidad.
  - Limpieza del carrito (`clearCart`).
  - Validaciones de ObjectId con DTOs.
  - Documentación interactiva completa con Swagger y Pruebas Unitarias.
- ✅ **Fase 0.6 (Orders)**:
  - Paginación con filtros de estado y rango de fechas en `findMyOrders()` y `findAllOrders()`.
  - Nuevo endpoint `GET /orders/:id` con protección de acceso (solo dueño o ADMIN).
  - Cancelación de pedidos por el cliente (`PATCH /orders/:id/cancel`), restringida a estado `PENDING`.
  - Vaciado automático del carrito después del checkout (se crea un nuevo carrito `ACTIVE`).
  - `ParseMongoIdPipe` aplicado en todos los parámetros `:id` del módulo.
  - Documentación completa en Swagger y 14 tests unitarios pasando.
- ✅ **Fase 0.7 (Common)**:
  - `TransformInterceptor` global: todas las respuestas exitosas siguen el contrato `{ success: true, data, timestamp }`.
  - `HttpExceptionFilter` mejorado: los errores incluyen `requestId` único, `path` y `method` para trazabilidad.
  - `RequestLoggerMiddleware`: registra cada HTTP request con método, ruta, código de estado y tiempo de respuesta.
  - Interface `PaginatedResponse<T>` y función reutilizable `paginate()` para eliminar código duplicado.
- ✅ **Fase 1 (Docker Profesional)**:
  - `Dockerfile` Multi-stage build optimizado, seguro (usuario non-root) y con control de procesos (`dumb-init`).
  - `docker-compose.yml` para desarrollo con API (hot-reload), Mongo, Redis y Mongo Express.
  - `docker-compose.prod.yml` configurado para alta disponibilidad y límites de recursos en producción.
- ✅ **Fase 2 (Calidad Global y Observabilidad)**:
  - Logging estructurado con `winston` + `nest-winston` y middleware de trazabilidad de requests (`requestId` único).
  - Health Checks con `@nestjs/terminus` en `GET /api/v1/health` (MongoDB ping + memory heap).
  - API Versioning con prefijo global `api/v1`.
  - Validación de variables de entorno al arranque con `Joi`.
  - Swagger UI interactivo en `GET /api/docs` con soporte de JWT Bearer Auth.
  - CORS configurado con origins desde variable de entorno `ALLOWED_ORIGINS`.
  - Plantilla `.env.example` documentada para onboarding de nuevos desarrolladores.

- ✅ **Fase 3 (Testing e Integración Continua)**:
  - Configuración de tests de cobertura (`npm run test:cov`) para ignorar archivos sin lógica.
  - Integración de `mongodb-memory-server` para pruebas E2E aisladas y seguras.
  - Tests E2E implementados para el flujo completo de autenticación (`/register` y `/login`).
  - GitHub Actions CI (`ci.yml`) configurado para ejecutar linter y tests automáticamente en cada push/PR.
  - Cobertura global de pruebas unitarias ampliada exitosamente al **>80%** (80.06%).

- ✅ **Fase 4 (Seguridad Avanzada)**:
  - Rate Limiting granular (`@Throttle`) contra ataques de fuerza bruta en Auth.
  - Audit Logs mediante interceptor global (IP, usuario, método y tiempo).
  - Sanitización estricta (`express-mongo-sanitize`) contra NoSQL Injection.
  - Protección de sobrecarga (límite JSON payload de 10mb).
  - Seguridad condicional: Helmet estricto y Swagger oculto en entorno de producción.

- ✅ **Fase 5 (Nuevos Módulos Core)**:
  - ✅ **Addresses**: Direcciones de envío.
  - ✅ **Uploads**: Subida de imágenes a AWS S3.
  - ✅ **Payments (MercadoPago)**: Servicio `PaymentsService` y webhook para procesar el éxito del pago.
  - ✅ **Notifications & Mail**: Sistema asíncrono para enviar push notifications (FCM) y correos (Nodemailer) en cada actualización de estado del pedido.
  - ✅ **Delivery**: Gestión de repartidores, disponibilidad, geolocalización, aceptación de pedidos y estadísticas. Rol `DELIVERY`.
  - ✅ **Events (WebSockets)**: Integración con Socket.io en tiempo real. Notificaciones automáticas al cliente cuando su pedido cambia de estado.
  - ✅ **Reviews**: Reseñas y calificaciones (1-5) solo sobre productos de pedidos `DELIVERED`, con índice único anti-duplicados y lectura pública.
  - ✅ **Coupons**: Cupones promocionales (`PERCENTAGE` / `FIXED`) con monto mínimo, tope de descuento, expiración, límite de usos y un uso por usuario.

- ✅ **Fase 6 (Rendimiento y Escala)**:
  - ✅ **Cache con Redis**: `@nestjs/cache-manager` + `@keyv/redis` aplicado en Categorías (1h) y Productos (10min).
  - ✅ **Colas con BullMQ**: Procesamiento en segundo plano (`QueuesService` + `NotificationsProcessor`) para correos y notificaciones push con backoff exponencial.
  - ✅ **Búsqueda Avanzada e Índices**: Índices compuestos optimizados en MongoDB (`ProductSchema` y `OrderSchema`) y ordenamiento dinámico (`sortBy`, `sortOrder`).
  - ✅ **Dashboard Analytics**: Módulo `/analytics` con Aggregation Pipelines de MongoDB (KPIs generales, evolución de ventas diarias y top productos más vendidos).
  - ✅ **Multi-entorno**: Carga dinámica de `.env.development`, `.env.staging` y `.env.production` con sus respectivas plantillas documentadas.

- ✅ **Frontend Fase 0 (Arquitectura Base, Design System `ui-ux-pro-max` y Core HTTP)**:
  - ✅ **Setup React 18 + TypeScript + Vite**: Configuración estricta con alias `@/*` y variables de entorno.
  - ✅ **Design System (`ui-ux-pro-max`)**: Fuentes `Outfit` y `Plus Jakarta Sans`, paleta semántica Light/Dark Mode y kit de componentes UI (`Button`, `Input`, `Badge`, `Modal`, `Drawer`, `Skeleton`, `EmptyState`).
  - ✅ **Cliente HTTP (`axios.client.ts`)**: Desenvolvimiento automático de `TransformInterceptor` y cola de rotación silenciosa de Refresh Tokens (`POST /auth/refresh`).
  - ✅ **Layouts Multi-Rol & Health Check**: `ClientLayout`, `DeliveryLayout` y `AdminLayout` + conexión en vivo con `GET /api/v1/health`.

- ✅ **Frontend Fase 1 (Autenticación, Celular Obligatorio, Verificación Dual SMS/Gmail, OAuth 2.0 Google/Facebook, Seguridad de Sesión, RBAC y Perfil con S3)**:
  - ✅ **Identidad, Celular Obligatorio, Verificación Dual (Gmail o SMS), Recuperación Real y Login Social (`/auth`)**: Vistas de Login y Registro en 2 pasos con **celular obligatorio** normalizado a E.164 (`+57...`), selector de canal (**Correo Gmail** o **SMS al celular** con soporte **Twilio Verify** / Programmable SMS y respaldo automático en desarrollo), pantalla `/verify-email` (`VerifyEmailPage.tsx`) con código OTP de 6 dígitos, verificación automática por enlace (`POST /auth/verify-email`) y cambio de canal al reenviar (`POST /auth/resend-verification`), inicio de sesión y vinculación automática con **Google y Facebook OAuth 2.0** (`SocialAuthButtons.tsx`, `POST /auth/google`, `POST /auth/facebook`) con exigencia de celular antes de pedir (`CompletePhoneModal`, banner en `ClientLayout`, bloqueo en `CheckoutPage` y guard `PHONE_REQUIRED` en `POST /orders`), bloqueo de login para cuentas no verificadas (`403 EMAIL_NOT_VERIFIED`), y flujo real de recuperación de contraseña por SMTP (`/forgot-password` → `/reset-password?token=...`, sin `devToken`).
  - ✅ **Guards de Navegación**: `ProtectedRoute` y `RoleGuard` (`CLIENT`, `DELIVERY`, `ADMIN`) con redirección automática por rol.
  - ✅ **Mi Perfil, Cuentas Vinculadas y Avatar Persistente en MongoDB + S3 (`/profile`)**: Edición de datos personales, celular (`phone`) y contraseña (`PATCH /users/:id` con `OwnershipGuard`), tarjeta **"Cuentas vinculadas"** para vincular/desvincular Google y Facebook (`POST /auth/link/:provider`, `DELETE /auth/unlink/:provider`), badge de estado de verificación de correo, modal de foto de perfil con subida a AWS S3 (`POST /uploads/avatars`) y persistencia de `avatarUrl` en MongoDB (visible también en **Admin → Usuarios y Roles** con modal de perfil ampliado).
  - ✅ **Limpieza Integral de Sesión y Resiliencia de Avatares (Bug #3 y Bug #4)**: Restablecimiento de dirección activa, cupón y UI del carrito al cerrar sesión o cambiar de usuario (`resetCartUi()` en `useCartDrawerStore`), vaciado forzado de la memoria caché de React Query (`queryClient.clear()`) para evitar contadores atascados en el Navbar, y nuevo componente `<UserAvatar />` con `referrerPolicy="no-referrer"` para prevenir bloqueos HTTP 429 de la CDN de Google.

- ✅ **Frontend Fase 2 (Catálogo de Licorería & Charcutería, Búsqueda Avanzada y Reseñas Públicas)**:
  - ✅ **Explorador de Catálogo (`CatalogPage.tsx`)**: Identidad comercial de licorería, cigarrillos, quesos y pasabocas, carrusel de categorías (`GET /categories`), buscador con *debounce* sincronizado con la URL, filtros por precio/disponibilidad, ordenamiento dinámico (`sortBy`, `sortOrder`) y paginación.
  - ✅ **Detalle de Producto y Reseñas (`ProductDetailModal.tsx`)**: Ficha de producto (`GET /products/:id`) y listado de reseñas verificadas (`GET /reviews/product/:productId`) con cálculo de promedio de estrellas.

- ✅ **Frontend Fase 3 (Carrito Persistente, Direcciones con Mapa y Cupones)**:
  - ✅ **Cart Drawer (`CartDrawer.tsx` + `useCartMutations.ts`)**: Sincronizado con `GET /cart`, `POST /cart/add`, `DELETE /cart/remove` y `DELETE /cart/clear` con actualizaciones optimistas (*Optimistic UI*) y rollback automático ante errores.
  - ✅ **Libreta de Direcciones con Mapa (`AddressesModal.tsx`)**: CRUD completo de direcciones (`/addresses`) + botón de GPS en vivo y mapa interactivo OpenStreetMap.
  - ✅ **Motor de Cupones (`CouponInputBox.tsx`)**: Validación de códigos promocionales contra `POST /coupons/apply` en tiempo real.

- ✅ **Frontend Fase 4 (Checkout, Cupones Reales, Cupo Mensual Rider, Pasarela MercadoPago, Mis Pedidos y Calificaciones)**:
  - ✅ **Checkout en 3 Pasos (`CheckoutPage.tsx`)**: Selección de dirección, revisión de ítems, validación del tope mensual real de 4 pedidos `-10%` para repartidores (`GET /orders/rider-discount-quota`), envío de `couponCode` real en `POST /orders` (redimido atómicamente en backend y liberado al cancelar en `PENDING`) y reflejo del descuento en MercadoPago y `OrderDetailPage.tsx`.
  - ✅ **Pasarela MercadoPago (`POST /orders/:id/pay` + `PaymentResultPage.tsx`)**: Redirección a MercadoPago Checkout Pro, simulador Sandbox local y vistas de retorno (`success`, `pending`, `failure`).
  - ✅ **Historial de Mis Pedidos (`MyOrdersPage.tsx`)**: Filtros por estado y rango de fechas (`GET /orders/me`) con paginación.
  - ✅ **Seguimiento, Cancelación y Reseñas (`OrderDetailPage.tsx` + `ReviewFormModal.tsx`)**: Stepper de progreso, cancelación en estado `PENDING` (`PATCH /orders/:id/cancel`) y calificación de 1 a 5 estrellas sobre productos entregados (`POST /reviews`).

- ✅ **Frontend Fase 5 (Tiempo Real y Notificaciones)**:
  - ✅ **WebSockets (`useSocket.ts`)**: Socket.io autenticado con `auth.token`; eventos `order_status_updated` (toast + sonido Web Audio + notificación nativa del navegador en segundo plano con `browserNotifications.ts`) y `delivery_location_updated`.
  - ✅ **Service Workers, Íconos PNG & Perfil (`sw.js`, `firebase-messaging-sw.js`, `browserNotifications.ts`, `ProfilePage.tsx`)**: registro seguro de `/sw.js` en `localhost` y producción (`window.isSecureContext`), íconos PNG compatibles (`icon-192.png` / `icon-512.png`), fallback automático a `new Notification`, `tag` único en pruebas, sincronización automática de permisos, guía accesible (`role="alert"`) para desbloquear notificaciones bloqueadas, manejo de `notificationclick` y cabeceras `no-cache` en `nginx.conf`.
  - ✅ **Tracking en vivo (`LiveTrackingMap.tsx`)**: posición del repartidor en `/orders/:id` cuando la orden está `OUT_FOR_DELIVERY`.
  - ✅ **Backend**: gateway acepta `auth.token` y usa `sub` del JWT; `DeliveryService` emite ubicación y estados.
  - ⏳ Push FCM remoto pendiente de credenciales de Firebase (`serviceAccount` en backend) y campo `fcmTokens` en DTOs de usuario.

- ✅ **Frontend Fase 6 (Portal del Repartidor & Programa de Socios Mensajeros)**: auto-activación de cuenta de repartidor desde `/profile` (`CLIENT` → `DELIVERY` con rotación de JWT en vivo), switch Online/Offline, pedidos disponibles, ruta activa con emisor GPS real/simulador, métricas (`/delivery/*`) y **beneficio exclusivo del 10% de descuento automático** en los primeros 4 pedidos personales de cada mes.

- ✅ **Frontend Fase 7 (Panel de Administración, Inventario/Stock, Costos y Analytics de Ganancias Reales)**: dashboard financiero con KPIs reales (ventas, costo de compra COGS, ganancia neta real, margen %, capital en inventario), gráfica comparativa **Ventas vs. Ganancia real**, tabla de rentabilidad por producto, alertas de inventario y exportación CSV (`/analytics/*`); despacho dual **Kanban | Tabla** de pedidos (`/admin/orders`); CRUD de productos con stock, precio de compra, calculadora de margen en vivo, desactivación automática al agotarse, alerta de pocas unidades en catálogo y subida a S3 (`/admin/products`); categorías, cupones y gestión de usuarios/roles.

- ✅ **Frontend Fase 8 (Testing, ESLint, Code Splitting, PWA y Dockerización)**: suite unitaria con **Vitest + Testing Library** (20 archivos / 59 tests pasando), flujo E2E multirrol con **Playwright**, configuración **ESLint 9**, **Code Splitting** (`React.lazy` + `manualChunks`), soporte **PWA** (`manifest.webmanifest` + íconos PNG/SVG + Service Workers), `Dockerfile` **Nginx unprivileged** (puerto `8080`), integración en **Docker Compose** y pipeline **GitHub Actions CI (`frontend-ci`)**.

*Siguiente paso: Infraestructura Cloud — Backend Fase 7 (AWS ECS Fargate) y Fase 8 (Kubernetes).*

---

## ⚙️ Inicio Rápido

El entorno de desarrollo se gestiona con **Docker Compose**. Desde la raíz del proyecto:

```bash
# 1. Levantar todos los servicios (API + MongoDB + Redis + Mongo Express)
docker compose up -d

# 2. Si mongo no se levanta
docker compose rm -f mongo-express

# 3. Ver los logs de la API en tiempo real
docker compose logs -f api

# 4. Ver test
npm run test:cov

# 5. Levantar todos los servicios (API + MongoDB + Redis + Mongo Express) Production
docker compose -f docker-compose.prod.yml up -d

# 6. Apagar todos los servicios
docker compose -f docker-compose.prod.yml down

# 7. Reiniciar solo la API
docker compose restart api



> **⚠️ Nota:** Si instalas una nueva librería (`npm install <paquete>`), debes reconstruir el contenedor de la API:
> ```bash
> docker compose up -d --build api
> ```

### URLs del entorno de desarrollo
| Servicio | URL |
|----------|-----|
| Frontend (Vite Dev) | `http://localhost:5173` |
| Frontend (Docker Nginx) | `http://localhost:8080` |
| API REST | `http://localhost:3000/api/v1` |
| Swagger UI | `http://localhost:3000/api/docs` |
| Health Check API | `http://localhost:3000/api/v1/health` |
| Mongo Express | `http://localhost:8081` | admin-pass

*Nota: Configura tu `.env` basándote en el archivo `.env.example` del backend antes de ejecutar.*

Como ejecutar las test


