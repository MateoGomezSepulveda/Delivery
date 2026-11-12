# Estado del Proyecto

**Última actualización:** 12 de Noviembre de 2026

## Última Tarea / Contexto Actual
- Se completaron las **Fases 0.1 a 0.7** del Backend (Módulos de negocio y utilidades base), blindando la API con autenticación, validaciones, paginación y trazabilidad.
- Se completaron las **Fases 1 a 6 del Backend** (Docker Profesional, Observabilidad, Testing >80% + CI, Seguridad Avanzada, 9 Módulos Core nuevos, Cache con Redis, Colas con BullMQ, Índices de MongoDB y Analytics).
- ✅ **Frontend — Fase 0 Completada (`delivery-frontend/`)**:
  - Arquitectura Vite + React 18 + TypeScript, Design System (`ui-ux-pro-max`), Cliente HTTP (`axios.client.ts` con Refresh Queue), UI Kit base y Layouts Multi-Rol.
- **[NUEVO] Frontend — Fase 1 Completada (`auth/` + `users/` + `uploads/`)**:
  - **Clientes API & JWT (`auth.api.ts`, `users.api.ts`, `uploads.api.ts`, `jwt.ts`)**: Integración completa de `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET/PATCH /users/:id` y `POST /uploads/avatars`.
  - **Estado de Sesión (`useAuthStore.ts`)**: Hidratación automática del perfil desde MongoDB al iniciar la app, persistencia sincronizada y manejo del evento `auth:session-expired`.
  - **Flujos de Identidad & Guards (`ProtectedRoute`, `RoleGuard`)**: Vistas `LoginPage`, `RegisterPage`, `ForgotPasswordPage` y `ResetPasswordPage` en `AuthLayout`, manejo de errores `429 Too Many Requests` (`@Throttle`) y protección de rutas por rol (`CLIENT`, `DELIVERY`, `ADMIN`).
  - **Mi Perfil & AWS S3 (`ProfilePage.tsx`)**: Edición de nombre/correo y contraseña (`OwnershipGuard`), subida de foto de perfil a AWS S3 (`multipart/form-data`, máx 5MB) y botón de prueba de rotación de Refresh Token.

## ⚠️ Deuda Técnica — Para Fase de Producción
- *Cuando se despliegue en producción con un dominio real, no será necesario utilizar túneles temporales y los webhooks de MercadoPago llegarán sin bloqueos.*
- *Migrar módulo de notificaciones (actualmente en Firebase FCM) a AWS SNS.*
- *Migrar módulo de correos (actualmente en Nodemailer local/Ethereal) a AWS SES.*
- *Integrar `coupons` en el checkout de `orders` (guardar `couponCode` y `discount` en la orden).*
- *Agregar tests unitarios adicionales para los services de `delivery` y `payments`.*
- *Limpiar los 8 warnings de ESLint (`no-unused-vars`).*

## Siguiente Paso
- **Probar Fase 1 del Frontend** en el navegador (`http://localhost:5173/login`, `/register`, `/forgot-password`, `/profile`) y hacer el commit de la Fase 1.
- **Iniciar Fase 2 del Frontend (`delivery-frontend/`)**: Catálogo Gastronómico (`GET /categories`, `GET /products` con debounce search, filtros por categoría/precio/disponibilidad, ordenamiento dinámico y paginación) y Modal de Detalle con Reseñas Públicas (`GET /reviews/product/:productId`).
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
