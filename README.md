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

*Siguiente paso: Fase 0.7 (Módulo `common/`).*

---

## ⚙️ Inicio Rápido

Para iniciar el entorno de desarrollo del backend localmente:

```bash
cd delivery-backend
npm install
npm run start:dev
```

O ejecutando con **Docker**:

```bash
cd delivery-backend
docker build -t delivery-backend .
docker run -p 3000:3000 --env-file .env delivery-backend
```

*Nota: Asegúrate de configurar correctamente tu archivo `.env` basándote en la documentación del backend antes de ejecutar el servidor.*
