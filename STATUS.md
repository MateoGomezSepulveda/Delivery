# Estado del Proyecto

**Última actualización:** 18 de Octubre de 2026

## Última Tarea / Contexto Actual
- Se completaron las **Fases 0.1 a 0.7** (Módulos de negocio y utilidades base), blindando la API con autenticación, validaciones, paginación y trazabilidad.
- Se completó la **Fase 1** (Docker Profesional)
- Se completó la **Fase 2** (Calidad Global y Observabilidad)
- Se completó la **Fase 3** (Testing + CI) con más del 80% de cobertura de código.
- Se completó la **Fase 4** (Seguridad Avanzada).
- **[NUEVO]** Se completó la **Fase 5 (Integración con Servicios Externos y Features Core)**:
  - Módulo Addresses (CRUD).
  - Módulo Uploads (AWS S3).
  - **Módulo Payments (MercadoPago)**: Generación de Preference, Redirecciones (`/success`, `/failure`, `/pending`) y Webhook de notificaciones (`/webhook`).
  - **Módulo Delivery**: Perfil de repartidor, disponibilidad, asignación de órdenes y estadísticas.
  - **Módulo Events (WebSockets)**: Emisión de eventos en tiempo real (`order_status_updated`) a clientes usando `Socket.io`.
  - **Módulo Reviews**: Reseñas (1-5) solo para pedidos `DELIVERED`, validando que el producto pertenezca a la orden. Lectura pública y eliminación por autor o Admin.
  - **Módulo Coupons**: CRUD (Admin) y `POST /coupons/apply` con descuentos `PERCENTAGE`/`FIXED`, monto mínimo, tope, expiración, límite global y uso único por usuario.
  - **CI reparado**: Los specs de `delivery`, `events` y `orders` no tenían los mocks de sus dependencias (`EventsGateway`, modelos, `JwtService`, `ConfigService`). Ahora pasan 15 suites / 98 tests unitarios + E2E.

## ⚠️ Deuda Técnica — Para Fase de Producción
- *Cuando se despliegue en producción con un dominio real, no será necesario utilizar túneles temporales y los webhooks de MercadoPago llegarán sin bloqueos.*
- *Migrar módulo de notificaciones (actualmente en Firebase FCM) a AWS SNS.*
- *Migrar módulo de correos (actualmente en Nodemailer local/Ethereal) a AWS SES.*
- *Integrar `coupons` en el checkout de `orders` (guardar `couponCode` y `discount` en la orden). Hoy `apply` registra el uso al validarse, de forma independiente al pedido.*
- *Agregar tests unitarios para los services de `delivery` y `payments` (hoy solo tienen el test "should be defined").*
- *Limpiar los 8 warnings de ESLint (`no-unused-vars`).*

## Siguiente Paso
- Iniciar la **Fase 6 — Rendimiento y Escala** (Redis cache, colas BullMQ, índices optimizados, dashboard de analytics, multi-entorno) según `docs/analisis_proyecto_delivery.md`.

---

### Fase 5: Integración con Servicios Externos y Features Avanzados (Completada ✅)
- [x] **Módulo Addresses**: Direcciones de envío (CRUD, isDefault, vinculación con User).
- [x] **Módulo Uploads (AWS S3)**: Servicio para subir imágenes.
- [x] **Módulo Payments**: Pasarela de pagos con MercadoPago integrada.
- [x] **Módulo Notifications & Mail**: Push notifications (FCM) y Correos implementados.
- [x] **Módulo Delivery**: Perfil y gestión de repartidores.
- [x] **Módulo Events**: WebSockets para notificaciones y tracking en tiempo real.
- [x] **Módulo Reviews**: Calificaciones de pedidos finalizados.
- [x] **Módulo Coupons**: Gestión de códigos promocionales.

## 🛠 Estado Actual
La Fase 5 está completa: todos los módulos core del delivery están implementados, documentados en Swagger y cubiertos por tests. El pipeline de CI vuelve a estar en verde. Lo siguiente es la Fase 6 (Rendimiento y Escala).
