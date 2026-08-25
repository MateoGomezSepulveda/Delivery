# Estado del Proyecto

**Última actualización:** 23 de Agosto de 2026

## Última Tarea / Contexto Actual
- Se completaron las **Fases 0.1 a 0.7** (Módulos de negocio y utilidades base), blindando la API con autenticación, validaciones, paginación y trazabilidad.
- Se completó la **Fase 1** (Docker Profesional):
  - Creación de `Dockerfile` multi-stage (builder y production) usando node:20-alpine y usuario non-root.
  - Implementación de `dumb-init`, labels OCI y `HEALTHCHECK`.
  - Configuración de `.dockerignore` exhaustivo.
  - Creación de `docker-compose.yml` para desarrollo (API con hot-reload, Mongo, Redis, Mongo Express).
  - Creación de `docker-compose.prod.yml` optimizado para producción.
- Se completó la **Fase 2** (Calidad Global y Observabilidad):
  - Logging estructurado con `winston` + `nest-winston` y `RequestLoggerMiddleware`.
  - Health Checks con `@nestjs/terminus` en `GET /api/v1/health` (MongoDB ping + memory heap).
  - API Versioning con prefijo global `api/v1`.
  - Validación del `.env` con `Joi` al arranque de la aplicación.
  - Swagger UI en `GET /api/docs` con soporte para JWT Bearer Auth.
  - CORS configurado con origins desde variable de entorno `ALLOWED_ORIGINS`.
  - Creación de `.env.example` como plantilla documentada.

## ⚠️ Deuda Técnica — Para Fase de Producción
- **Swagger en Producción:** Desactivar Swagger y volver a Helmet estricto cuando `NODE_ENV=production`.
  - Swagger debe estar disponible solo en `development` y `staging`.

- Se completó la infraestructura base de la **Fase 3** (Testing + CI):
  - Configuración de Jest para medir cobertura ignorando archivos sin lógica.
  - Integración de `mongodb-memory-server` para base de datos temporal en E2E.
  - Implementación de pruebas E2E para el módulo de Auth (`/register` y `/login`).
  - Creación del pipeline CI con GitHub Actions (`ci.yml`) para ejecutar tests y linter en cada push.

## Siguiente Paso
- Ampliar cobertura de Tests E2E (Flujo Carrito → Pedidos) o avanzar a la siguiente fase según el roadmap general.
