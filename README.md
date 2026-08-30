# 🚚 App Delivery - Proyecto Principal

Bienvenido al repositorio principal de la plataforma **App Delivery**. Este proyecto está diseñado con una arquitectura moderna, segura y escalable orientada a módulos desacoplados, enfocado en las mejores prácticas de desarrollo de software.

---

## 📁 Estructura del Repositorio

- **`delivery-backend/`**: Servidor API RESTful principal. Construido con **NestJS 11**, **MongoDB**, **Mongoose** y contenedorizado con **Docker**. Contiene toda la lógica de negocio, reglas de seguridad y autenticación. Consulta su documentación completa en el [README del backend](./delivery-backend/README.md).
- **`docs/`**: Documentación adicional de la arquitectura e infraestructura del proyecto.
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

- ⏳ **Fase 5 (Nuevos Módulos Core - En Progreso)**:
  - ✅ **Addresses**: Direcciones de envío.
  - ✅ **Uploads**: Subida de imágenes a AWS S3.
  - ✅ **Payments (MercadoPago)**: Servicio `PaymentsService` y webhook para procesar el éxito del pago.
  - ✅ **Notifications & Mail**: Sistema asíncrono para enviar push notifications (FCM) y correos (Nodemailer) en cada actualización de estado del pedido.
  - ✅ **Delivery**: Gestión de repartidores, disponibilidad, geolocalización, aceptación de pedidos y estadísticas. Rol `DELIVERY`.
  - ✅ **Events (WebSockets)**: Integración con Socket.io en tiempo real. Notificaciones automáticas al cliente cuando su pedido cambia de estado.
  - ⏳ **Pendientes**: `reviews`, `coupons`.

*Siguiente paso: Finalizar módulos pendientes de la Fase 5.*

---

## ⚙️ Inicio Rápido

El entorno de desarrollo se gestiona con **Docker Compose**. Desde la raíz del proyecto:

```bash
# 1. Levantar todos los servicios (API + MongoDB + Redis + Mongo Express)
docker compose up -d

# 2. Ver los logs de la API en tiempo real
docker compose logs -f api
```

> **⚠️ Nota:** Si instalas una nueva librería (`npm install <paquete>`), debes reconstruir el contenedor de la API:
> ```bash
> docker compose up -d --build api
> ```

### URLs del entorno de desarrollo
| Servicio | URL |
|----------|-----|
| API REST | `http://localhost:3000/api/v1` |
| Swagger UI | `http://localhost:3000/api/docs` |
| Health Check | `http://localhost:3000/api/v1/health` |
| Mongo Express | `http://localhost:8081` |

*Nota: Configura tu `.env` basándote en el archivo `.env.example` del backend antes de ejecutar.*
