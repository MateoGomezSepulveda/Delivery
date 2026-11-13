# Estado del Proyecto

**Última actualización:** 13 de Noviembre de 2026

## Última Tarea / Contexto Actual
- Se completaron las **Fases 0.1 a 0.7** del Backend (Módulos de negocio y utilidades base), blindando la API con autenticación, validaciones, paginación y trazabilidad.
- Se completaron las **Fases 1 a 6 del Backend** (Docker Profesional, Observabilidad, Testing >80% + CI, Seguridad Avanzada, 9 Módulos Core nuevos, Cache con Redis, Colas con BullMQ, Índices de MongoDB y Analytics).
- ✅ **Frontend — Fase 0 Completada (`delivery-frontend/`)**:
  - Arquitectura Vite + React 18 + TypeScript, Design System (`ui-ux-pro-max`), Cliente HTTP (`axios.client.ts` con Refresh Queue), UI Kit base y Layouts Multi-Rol.
- ✅ **Frontend — Fase 1 Completada (`auth/` + `users/` + `uploads/`)**:
  - Autenticación JWT completa, Guards por rol (`ProtectedRoute`, `RoleGuard`), `ProfilePage` y subida de Avatar a S3 con normalización automática de imágenes `.jfif`/`.jpeg`/`.avif` a `.jpg` mediante `<canvas>`.
- ✅ **Frontend — Fase 2 y Fase 3 Completadas (`categories/`, `products/`, `reviews/`, `cart/`, `addresses/`, `coupons/`)**:
  - Catálogo gastronómico con filtros sincronizados con URL, reseñas públicas, carrito persistente (`CartDrawer`) con mutaciones optimistas y rollback (`useCartMutations.ts`), libreta de direcciones con GPS/Mapa OpenStreetMap (`AddressesModal`) y validador de cupones (`CouponInputBox`).
- **[NUEVO] Frontend — Fase 4 Completada (`orders/` + `payments/` + `reviews/`)**:
  - **Servicio de Órdenes (`src/api/endpoints/orders.api.ts`)**: Conectado a `POST /orders`, `GET /orders/me`, `GET /orders/:id`, `PATCH /orders/:id/cancel`, `POST /orders/:id/pay`, `GET /orders` (Admin) y `PATCH /orders/:id/status` (Admin).
  - **Checkout en 3 Pasos (`src/pages/client/CheckoutPage.tsx`)**: Selección de dirección desde la libreta o GPS, revisión de ítems del carrito activo, aplicación de cupón y confirmación con redirección a **MercadoPago Checkout Pro** (`POST /orders/:id/pay`) o seguimiento directo.
  - **Vistas de Retorno de Pago (`src/pages/client/PaymentResultPage.tsx`)**: Soporte para `/payments/success`, `/payments/pending` y `/payments/failure` con botón de reintento de pago.
  - **Historial de Mis Pedidos (`src/pages/client/MyOrdersPage.tsx`)**: Listado paginado (`GET /orders/me`) con filtros por estado (`PENDING`, `PAID`, `CONFIRMED`, `PREPARING`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`) y rango de fechas (`dateFrom`, `dateTo`).
  - **Detalle de Orden, Cancelación y Reseñas Verificadas (`src/pages/client/OrderDetailPage.tsx` + `ReviewFormModal.tsx`)**: Stepper visual de progreso, cancelación por cliente en estado `PENDING` (`PATCH /orders/:id/cancel`), consola rápida de transición de estado para pruebas Admin y calificación de 1 a 5 estrellas por producto entregado (`POST /reviews`).

- **[NUEVO] Frontend — Fase 5 Completada (Tiempo Real: `events/` + Web Notifications / SW)**:
  - `useSocket.ts` (Socket.io autenticado con `auth.token`, reconexión al rotar el JWT), toast + sonido (`utils/sound.ts`, Web Audio API) en `order_status_updated`, notificaciones del navegador en segundo plano (`utils/browserNotifications.ts` cuando `document.visibilityState === 'hidden'`), `LiveTrackingMap` en `/orders/:id` cuando la orden está `OUT_FOR_DELIVERY` (`delivery_location_updated`), tarjeta de activación/prueba en `ProfilePage`, handler `notificationclick` en `public/sw.js` y Service Worker base `public/firebase-messaging-sw.js` sin caché en `nginx.conf`.
  - Backend: el gateway acepta `handshake.auth.token` y une al usuario a su sala con `payload.sub`; `DeliveryService` emite `delivery_location_updated` y `order_status_updated` (accept/deliver).
  - **Pendiente para Push FCM remoto (requiere configuración externa + backend):** credenciales de Firebase Console (`serviceAccount` en `NotificationsService` y config web `VITE_FIREBASE_*`) + permitir `fcmTokens` en `CreateUserDto`/`UpdateUserDto` del backend (actualmente protegido por `forbidNonWhitelisted: true`).

- **[NUEVO] Frontend — Fase 6 Completada (`delivery/`)**:
  - `DeliveryLayout` con onboarding (`POST /delivery/profile` si `GET` devuelve 404), switch Online/Offline (`PATCH /delivery/availability`) y navegación inferior.
  - `/delivery` pedidos disponibles (auto-refresh 10 s, `PATCH .../accept`), `/delivery/active` (emisor GPS real + simulador de ruta vía `PATCH /delivery/location`, `PATCH .../deliver`) y `/delivery/stats`.
  - Backend: nuevo `GET /delivery/orders/active` (pedidos OUT_FOR_DELIVERY del repartidor).
  - Nota: los endpoints `/delivery/*` solo permiten rol `DELIVERY` (un ADMIN recibe 403).

- **[NUEVO] Frontend — Fase 7 Completada (Panel de Administración y Analytics)**:
  - `AdminLayout` con navegación real y 6 secciones: Dashboard (`/admin`: KPIs, ventas diarias, top productos y pedidos por estado desde `/analytics/*`), Despacho dual **Kanban | Tabla** con buscador por `#ID`/cliente/correo/dirección y filtro por estado (`/admin/orders`), Productos con subida de imagen a S3 (`/admin/products`), Categorías, Cupones y Usuarios/Roles (`PATCH /users/:id/role`).
  - Las gráficas son SVG/CSS propios (sin Recharts) para no aumentar el bundle.

- **[NUEVO] Frontend — Fase 8 + Cierre de Pendientes Completados (Testing, ESLint, Code Splitting, PWA y Dockerización)**:
  - **ESLint 9 (`eslint.config.js`)**: configuración TypeScript + React Hooks + React Refresh (`0 errors, 0 warnings`), corrigiendo hook condicional en `src/components/ui/Input.tsx`.
  - **Testing Unitario y de Componentes (Vitest + Testing Library + jsdom)**: 8 suites / 23 tests pasando (`jwt.test.ts`, `formatters.test.ts`, `useAuthStore.test.ts`, `useCartMutations.test.tsx`, `CouponInputBox.test.tsx`, `LoginPage.test.tsx`, `CheckoutPage.test.tsx`, `AdminOrdersPage.test.tsx`).
  - **Testing E2E (`Playwright` en `e2e/delivery-flow.spec.ts`)**: flujo multirrol completo (Cliente crea pedido -> Admin confirma y prepara -> Repartidor acepta y entrega -> Cliente califica con reseña).
  - **Code Splitting & PWA**: `React.lazy` + `Suspense` en todas las rutas (`AppRouter.tsx`) y `manualChunks` en `vite.config.ts` + `manifest.webmanifest`, íconos SVG (`192`/`512`) y Service Workers (`public/sw.js` + `public/firebase-messaging-sw.js`).
  - **Dockerización & CI**: `delivery-frontend/Dockerfile` multi-stage con `nginxinc/nginx-unprivileged:1.27-alpine` (non-root, puerto `8080`, `gzip`, caché inmutable en `/assets/`, no-cache en `sw.js`/`firebase-messaging-sw.js`, `/healthz` y fallback SPA en `nginx.conf`), servicio `frontend` integrado en `docker-compose.yml` y `docker-compose.prod.yml`, y job `frontend-ci` en `.github/workflows/ci.yml`.

## ⚠️ Deuda Técnica — Para Fase de Producción
- *Cuando se despliegue en producción con un dominio real, no será necesario utilizar túneles temporales y los webhooks de MercadoPago llegarán sin bloqueos.*
- *Migrar módulo de notificaciones (actualmente en Firebase FCM) a AWS SNS.*
- *Migrar módulo de correos (actualmente en Nodemailer local/Ethereal) a AWS SES.*
- *Integrar `coupons` en el checkout de `orders` (guardar `couponCode` y `discount` en la orden).*
- *Agregar tests unitarios adicionales para los services de `delivery` y `payments`.*
- *Limpiar los 8 warnings de ESLint (`no-unused-vars`).*

## Siguiente Paso
- **Verificar visualmente en el navegador** las mejoras finales del frontend (mutaciones optimistas en carrito, vista dual Kanban/Tabla en `/admin/orders` y permisos de notificaciones en `/profile`) y commitear los cambios.
- **Fase 7 Backend — Deploy a Producción con AWS (ECS Fargate)** y **Fase 8 Backend — Kubernetes** (junto con integración futura de Push FCM remoto / AWS SNS y cupones en órdenes en el backend cuando se requiera).

---

### Fase 6: Rendimiento y Escala (Completada ✅)
- [x] **Redis cache configurado**: Categorías (1h) y Productos (10min) con `@keyv/redis`.
- [x] **Colas BullMQ funcionando**: `QueuesService` y `NotificationsProcessor` con reintentos exponenciales.
- [x] **Índices de MongoDB optimizados**: Índices compuestos en `Product` y `Order` + ordenamiento dinámico.
- [x] **Dashboard de analytics**: Aggregation pipelines para KPIs, ventas diarias y top productos.
- [x] **Archivos de entorno separados**: `.env.development`, `.env.staging`, `.env.production` + `.example`.

## 🛠 Estado Actual
Las Fases 0 a 6 del backend están 100% implementadas, documentadas en Swagger y respaldadas por suites de pruebas unitarias y E2E. El proyecto está listo para la Fase 7 (Despliegue en AWS con ECS Fargate).
