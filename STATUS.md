# Estado del Proyecto

**Última actualización:** 28 de Agosto de 2026

## Última Tarea / Contexto Actual
- Se completaron las **Fases 0.1 a 0.7** (Módulos de negocio y utilidades base), blindando la API con autenticación, validaciones, paginación y trazabilidad.
- Se completó la **Fase 1** (Docker Profesional)
- Se completó la **Fase 2** (Calidad Global y Observabilidad)
- Se completó la **Fase 3** (Testing + CI) con más del 80% de cobertura de código.
- Se completó la **Fase 4** (Seguridad Avanzada).
- **[NUEVO]** Se completó gran parte de la **Fase 5 (Integración con Servicios Externos)**:
  - Módulo Addresses (CRUD).
  - Módulo Uploads (AWS S3).
  - **Módulo Payments (MercadoPago)**: Generación de Preference, Redirecciones (`/success`, `/failure`, `/pending`) y Webhook de notificaciones (`/webhook`).

## ⚠️ Deuda Técnica — Para Fase de Producción
- *Cuando se despliegue en producción con un dominio real, no será necesario utilizar túneles temporales y los webhooks de MercadoPago llegarán sin bloqueos.*

## Siguiente Paso
- Implementar los módulos restantes de la Fase 5: `delivery`, `events`, `reviews` y `coupons`.

---

### Fase 5: Integración con Servicios Externos y Features Avanzados (En Progreso)
- [x] **Módulo Addresses**: Direcciones de envío (CRUD, isDefault, vinculación con User).
- [x] **Módulo Uploads (AWS S3)**: Servicio para subir imágenes.
- [x] **Módulo Payments**: Pasarela de pagos con MercadoPago integrada.
- [x] **Módulo Notifications & Mail**: Push notifications (FCM) y Correos implementados.
- [ ] **Módulo Delivery**: Perfil y gestión de repartidores.
- [ ] **Módulo Events**: WebSockets para notificaciones y tracking en tiempo real.
- [ ] **Módulo Reviews**: Calificaciones de pedidos finalizados.
- [ ] **Módulo Coupons**: Gestión de códigos promocionales.

## 🛠 Estado Actual
Hemos completado la primera mitad de la Fase 5 (Pagos, Notificaciones, Uploads y Direcciones). Ahora debemos proceder a implementar los módulos de negocio complementarios (Deliveries, Events, Reviews, Coupons) para cerrar la fase.
