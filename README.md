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

- ✅ **Frontend Fase 1 (Autenticación, Seguridad de Sesión, RBAC y Perfil con S3)**:
  - ✅ **Identidad Completa (`/auth`)**: Vistas de Login, Registro con auto-login, Recuperación (`forgot-password`) y Restablecimiento de contraseña (`reset-password`).
  - ✅ **Guards de Navegación**: `ProtectedRoute` y `RoleGuard` (`CLIENT`, `DELIVERY`, `ADMIN`) con redirección automática por rol.
  - ✅ **Mi Perfil y Avatar en S3 (`/profile`)**: Edición de datos personales y contraseña (`PATCH /users/:id` con `OwnershipGuard`), subida de avatar a AWS S3 (`POST /uploads/avatars`) con normalización automática de `.jfif`/`.jpeg` a `.jpg` y rotación de Refresh Token.

- ✅ **Frontend Fase 2 (Catálogo Gastronómico, Búsqueda Avanzada y Reseñas Públicas)**:
  - ✅ **Explorador de Menú (`CatalogPage.tsx`)**: Carrusel de categorías (`GET /categories`), buscador con *debounce* sincronizado con la URL, filtros por precio/disponibilidad, ordenamiento dinámico (`sortBy`, `sortOrder`) y paginación.
  - ✅ **Detalle de Producto y Reseñas (`ProductDetailModal.tsx`)**: Ficha de producto (`GET /products/:id`) y listado de reseñas verificadas (`GET /reviews/product/:productId`) con cálculo de promedio de estrellas.

- ✅ **Frontend Fase 3 (Carrito Persistente, Direcciones con Mapa y Cupones)**:
  - ✅ **Cart Drawer (`CartDrawer.tsx` + `useCartMutations.ts`)**: Sincronizado con `GET /cart`, `POST /cart/add`, `DELETE /cart/remove` y `DELETE /cart/clear` con actualizaciones optimistas (*Optimistic UI*) y rollback automático ante errores.
  - ✅ **Libreta de Direcciones con Mapa (`AddressesModal.tsx`)**: CRUD completo de direcciones (`/addresses`) + botón de GPS en vivo y mapa interactivo OpenStreetMap.
  - ✅ **Motor de Cupones (`CouponInputBox.tsx`)**: Validación de códigos promocionales contra `POST /coupons/apply` en tiempo real.

- ✅ **Frontend Fase 4 (Checkout, Pasarela MercadoPago, Mis Pedidos y Calificaciones)**:
  - ✅ **Checkout en 3 Pasos (`CheckoutPage.tsx`)**: Selección de dirección, revisión de ítems, aplicación de cupón y creación de orden (`POST /orders`).
  - ✅ **Pasarela MercadoPago (`POST /orders/:id/pay` + `PaymentResultPage.tsx`)**: Redirección a MercadoPago Checkout Pro, simulador Sandbox local y vistas de retorno (`success`, `pending`, `failure`).
  - ✅ **Historial de Mis Pedidos (`MyOrdersPage.tsx`)**: Filtros por estado y rango de fechas (`GET /orders/me`) con paginación.
  - ✅ **Seguimiento, Cancelación y Reseñas (`OrderDetailPage.tsx` + `ReviewFormModal.tsx`)**: Stepper de progreso, cancelación en estado `PENDING` (`PATCH /orders/:id/cancel`) y calificación de 1 a 5 estrellas sobre productos entregados (`POST /reviews`).

- ✅ **Frontend Fase 5 (Tiempo Real y Notificaciones)**:
  - ✅ **WebSockets (`useSocket.ts`)**: Socket.io autenticado con `auth.token`; eventos `order_status_updated` (toast + sonido Web Audio + notificación nativa del navegador en segundo plano con `browserNotifications.ts`) y `delivery_location_updated`.
  - ✅ **Service Workers & Perfil (`sw.js`, `firebase-messaging-sw.js`, `ProfilePage.tsx`)**: manejo de `notificationclick`, activación/prueba desde el perfil y cabeceras `no-cache` en `nginx.conf`.
  - ✅ **Tracking en vivo (`LiveTrackingMap.tsx`)**: posición del repartidor en `/orders/:id` cuando la orden está `OUT_FOR_DELIVERY`.
  - ✅ **Backend**: gateway acepta `auth.token` y usa `sub` del JWT; `DeliveryService` emite ubicación y estados.
  - ⏳ Push FCM remoto pendiente de credenciales de Firebase (`serviceAccount` en backend) y campo `fcmTokens` en DTOs de usuario.

- ✅ **Frontend Fase 6 (Portal del Repartidor)**: onboarding de perfil, switch Online/Offline, pedidos disponibles, ruta activa con emisor GPS real/simulador y métricas (`/delivery/*`).

- ✅ **Frontend Fase 7 (Panel de Administración y Analytics)**: dashboard con KPIs y gráficas (`/analytics/*`), despacho dual **Kanban | Tabla** de pedidos con búsqueda y filtro por estado (`/admin/orders`), CRUD de productos (con subida a S3), categorías, cupones y gestión de usuarios/roles.

- ✅ **Frontend Fase 8 (Testing, ESLint, Code Splitting, PWA y Dockerización)**: suite unitaria con **Vitest + Testing Library** (8 archivos / 23 tests), flujo E2E multirrol con **Playwright**, configuración **ESLint 9**, **Code Splitting** (`React.lazy` + `manualChunks`), soporte **PWA** (`manifest.webmanifest` + Service Workers), `Dockerfile` **Nginx unprivileged** (puerto `8080`), integración en **Docker Compose** y pipeline **GitHub Actions CI (`frontend-ci`)**.

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


