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
- Implementar **Módulo Notifications**: Push notifications (FCM) o envío de correos transaccionales para alertar a los usuarios de cambios de estado en sus órdenes.

---

### Fase 5: Integración con AWS y Features Avanzados
- [x] **Módulo Addresses**: Direcciones de envío (CRUD, isDefault, vinculación con User).
- [x] **Módulo Uploads (AWS S3)**: Servicio para subir imágenes (avatares, fotos de productos).
- [x] **Módulo Payments**: Pasarela de pagos con MercadoPago integrada.
- [x] **Módulo Notifications**: Push notifications (FCM) y Correos implementados.

## 🛠 Estado Actual
**Fase 5 casi completada.**
Acabamos de finalizar exitosamente el **Módulo Payments**. La API ahora está conectada a MercadoPago, permitiendo generar enlaces de pago de manera dinámica. Además, se construyeron los endpoints de redirección de estado y el Webhook de notificaciones en tiempo real, permitiendo actualizar automáticamente las órdenes a estado `PAID` al confirmarse el pago.
