# Estado del Proyecto

**Última actualización:** 12 de Noviembre de 2026

## Última Tarea / Contexto Actual
- Se completaron las **Fases 0.1 a 0.7** del Backend (Módulos de negocio y utilidades base), blindando la API con autenticación, validaciones, paginación y trazabilidad.
- Se completaron las **Fases 1 a 6 del Backend** (Docker Profesional, Observabilidad, Testing >80% + CI, Seguridad Avanzada, 9 Módulos Core nuevos, Cache con Redis, Colas con BullMQ, Índices de MongoDB y Analytics).
- ✅ **Frontend — Fase 0 Completada (`delivery-frontend/`)**:
  - Arquitectura Vite + React 18 + TypeScript, Design System (`ui-ux-pro-max`), Cliente HTTP (`axios.client.ts` con Refresh Queue), UI Kit base y Layouts Multi-Rol.
- ✅ **Frontend — Fase 1 Completada (`auth/` + `users/` + `uploads/`)**:
  - Autenticación JWT completa, Guards por rol (`ProtectedRoute`, `RoleGuard`), `ProfilePage` y subida de Avatar a S3 con normalización automática de imágenes `.jfif`/`.jpeg`/`.avif` a `.jpg` mediante `<canvas>`.
- **[NUEVO] Frontend — Fase 2 y Fase 3 Completadas (`categories/`, `products/`, `reviews/`, `cart/`, `addresses/`, `coupons/`)**:
  - **Catálogo Gastronómico & Reseñas (`CatalogPage`, `ProductDetailModal`)**: Barra de categorías (`GET /categories`), buscador con `useDebounce` sincronizado con URL Query Params, filtros de precio/disponibilidad, ordenamiento dinámico (`sortBy`, `sortOrder`), paginación, sembrador de catálogo demo en 1 clic (Admin) y reseñas públicas por producto (`GET /reviews/product/:productId`).
  - **Carrito Persistente (`CartDrawer`)**: Sincronización en tiempo real con `GET /cart`, `POST /cart/add`, `DELETE /cart/remove` y `DELETE /cart/clear`.
  - **Libreta de Direcciones con Mapa (`AddressesModal`)**: CRUD completo contra `/api/v1/addresses` + geolocalización GPS (`navigator.geolocation`) con geocodificación inversa (OpenStreetMap Nominatim) y vista de mapa interactivo.
  - **Motor de Cupones Promocionales (`CouponInputBox`)**: Validación en tiempo real contra `POST /api/v1/coupons/apply` calculando descuento (`PERCENTAGE` / `FIXED`) y total final.

## ⚠️ Deuda Técnica — Para Fase de Producción
- *Cuando se despliegue en producción con un dominio real, no será necesario utilizar túneles temporales y los webhooks de MercadoPago llegarán sin bloqueos.*
- *Migrar módulo de notificaciones (actualmente en Firebase FCM) a AWS SNS.*
- *Migrar módulo de correos (actualmente en Nodemailer local/Ethereal) a AWS SES.*
- *Integrar `coupons` en el checkout de `orders` (guardar `couponCode` y `discount` en la orden).*
- *Agregar tests unitarios adicionales para los services de `delivery` y `payments`.*
- *Limpiar los 8 warnings de ESLint (`no-unused-vars`).*

## Siguiente Paso
- **Probar Fases 2 y 3 del Frontend** en el navegador (`http://localhost:5173`): sembrar el catálogo demo como Admin, filtrar productos, ver reseñas, agregar ítems al carrito, crear una dirección con GPS/Mapa, aplicar el cupón `BIENVENIDA20` y hacer el commit correspondiente.
- **Iniciar Fase 4 del Frontend (`delivery-frontend/`)**: Checkout en 3 pasos (`POST /orders`), pasarela de pagos **MercadoPago** (`POST /orders/:id/pay` + vistas `success/failure/pending`), historial de **Mis Pedidos** (`GET /orders/me`), cancelación por cliente (`PATCH /orders/:id/cancel`) y formulario de calificación de productos entregados (`POST /reviews`).
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
