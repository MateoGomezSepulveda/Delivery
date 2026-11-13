# Estado del Proyecto

**Última actualización:** 12 de Noviembre de 2026

## Última Tarea / Contexto Actual
- Se completaron las **Fases 0.1 a 0.7** del Backend (Módulos de negocio y utilidades base), blindando la API con autenticación, validaciones, paginación y trazabilidad.
- Se completaron las **Fases 1 a 6 del Backend** (Docker Profesional, Observabilidad, Testing >80% + CI, Seguridad Avanzada, 9 Módulos Core nuevos, Cache con Redis, Colas con BullMQ, Índices de MongoDB y Analytics).
- ✅ **Frontend — Fase 0 Completada (`delivery-frontend/`)**:
  - Arquitectura Vite + React 18 + TypeScript, Design System (`ui-ux-pro-max`), Cliente HTTP (`axios.client.ts` con Refresh Queue), UI Kit base y Layouts Multi-Rol.
- ✅ **Frontend — Fase 1 Completada (`auth/` + `users/` + `uploads/`)**:
  - Autenticación JWT completa, Guards por rol (`ProtectedRoute`, `RoleGuard`), `ProfilePage` y subida de Avatar a S3 con normalización automática de imágenes `.jfif`/`.jpeg`/`.avif` a `.jpg` mediante `<canvas>`.
- ✅ **Frontend — Fase 2 y Fase 3 Completadas (`categories/`, `products/`, `reviews/`, `cart/`, `addresses/`, `coupons/`)**:
  - Catálogo gastronómico con filtros sincronizados con URL, reseñas públicas, carrito persistente (`CartDrawer`), libreta de direcciones con GPS/Mapa OpenStreetMap (`AddressesModal`) y validador de cupones (`CouponInputBox`).
- **[NUEVO] Frontend — Fase 4 Completada (`orders/` + `payments/` + `reviews/`)**:
  - **Servicio de Órdenes (`src/api/endpoints/orders.api.ts`)**: Conectado a `POST /orders`, `GET /orders/me`, `GET /orders/:id`, `PATCH /orders/:id/cancel`, `POST /orders/:id/pay`, `GET /orders` (Admin) y `PATCH /orders/:id/status` (Admin).
  - **Checkout en 3 Pasos (`src/pages/client/CheckoutPage.tsx`)**: Selección de dirección desde la libreta o GPS, revisión de ítems del carrito activo, aplicación de cupón y confirmación con redirección a **MercadoPago Checkout Pro** (`POST /orders/:id/pay`) o seguimiento directo.
  - **Vistas de Retorno de Pago (`src/pages/client/PaymentResultPage.tsx`)**: Soporte para `/payments/success`, `/payments/pending` y `/payments/failure` con botón de reintento de pago.
  - **Historial de Mis Pedidos (`src/pages/client/MyOrdersPage.tsx`)**: Listado paginado (`GET /orders/me`) con filtros por estado (`PENDING`, `PAID`, `CONFIRMED`, `PREPARING`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`) y rango de fechas (`dateFrom`, `dateTo`).
  - **Detalle de Orden, Cancelación y Reseñas Verificadas (`src/pages/client/OrderDetailPage.tsx` + `ReviewFormModal.tsx`)**: Stepper visual de progreso, cancelación por cliente en estado `PENDING` (`PATCH /orders/:id/cancel`), consola rápida de transición de estado para pruebas Admin y calificación de 1 a 5 estrellas por producto entregado (`POST /reviews`).

- **[NUEVO] Frontend — Fase 5 Completada (Tiempo Real: `events/`)**:
  - `useSocket.ts` (Socket.io autenticado con `auth.token`, reconexión al rotar el JWT), toast + sonido (`utils/sound.ts`, Web Audio API) en `order_status_updated`, y `LiveTrackingMap` en `/orders/:id` cuando la orden está `OUT_FOR_DELIVERY` (`delivery_location_updated`).
  - Backend: el gateway ahora acepta `handshake.auth.token` y une al usuario a su sala con `payload.sub` (antes usaba `payload.userId`, que no existe en el JWT); `DeliveryService` emite `delivery_location_updated` y `order_status_updated` (accept/deliver).
  - **Pendiente de Fase 5:** Push FCM (requiere credenciales de Firebase del proyecto web y `serviceAccount` en backend).

## ⚠️ Deuda Técnica — Para Fase de Producción
- *Cuando se despliegue en producción con un dominio real, no será necesario utilizar túneles temporales y los webhooks de MercadoPago llegarán sin bloqueos.*
- *Migrar módulo de notificaciones (actualmente en Firebase FCM) a AWS SNS.*
- *Migrar módulo de correos (actualmente en Nodemailer local/Ethereal) a AWS SES.*
- *Integrar `coupons` en el checkout de `orders` (guardar `couponCode` y `discount` en la orden).*
- *Agregar tests unitarios adicionales para los services de `delivery` y `payments`.*
- *Limpiar los 8 warnings de ESLint (`no-unused-vars`).*

## Siguiente Paso
- **Probar la Fase 5** (dos pestañas: cliente + admin avanzando estados; repartidor con `PATCH /delivery/location` desde Postman) y hacer commit.
- **Fase 6 del Frontend**: Portal del Repartidor (perfil, disponibilidad, pedidos disponibles, entrega activa con emisor GPS/simulador, estadísticas).
- *(Nota: La **Fase 7 — Deploy a Producción con AWS (ECS Fargate)** y la **Fase 8 — Kubernetes** quedan programadas para el cierre del proyecto completo, una vez finalizado el Frontend).*

---

### Fase 6: Rendimiento y Escala (Completada ✅)
- [x] **Redis cache configurado**: Categorías (1h) y Productos (10min) con `@keyv/redis`.
- [x] **Colas BullMQ funcionando**: `QueuesService` y `NotificationsProcessor` con reintentos exponenciales.
- [x] **Índices de MongoDB optimizados**: Índices compuestos en `Product` y `Order` + ordenamiento dinámico.
- [x] **Dashboard de analytics**: Aggregation pipelines para KPIs, ventas diarias y top productos.
- [x] **Archivos de entorno separados**: `.env.development`, `.env.staging`, `.env.production` + `.example`.

## 🛠 Estado Actual
Las Fases 0 a 6 del backend están 100% implementadas, documentadas en Swagger y respaldadas por suites de pruebas unitarias y E2E. El proyecto está listo para la Fase 7 (Despliegue en AWS con ECS Fargate).
