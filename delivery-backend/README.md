# 📦 App Delivery – Backend API

API RESTful completa para la plataforma de **App Delivery**, desarrollada con **NestJS (v11)**, **TypeScript**, **MongoDB** y **Mongoose**. Sigue una arquitectura modular, limpia y robusta, con seguridad por roles, autenticación JWT, limitación de tasa (rate limiting) y soporte para Docker.

---

## 🚀 Tecnologías Utilizadas

- **Framework Core:** NestJS (v11) & Node.js
- **Base de Datos:** MongoDB Atlas / Mongoose (v9)
- **Autenticación & Encriptación:** JWT (`@nestjs/jwt`, `passport-jwt`) & `bcrypt`
- **Autorización:** Control de Acceso Basado en Roles (RBAC: `ADMIN`, `CLIENT`, `DELIVERY`)
- **Validación de Datos:** `class-validator` & `class-transformer` (ValidationPipe estricto)
- **Seguridad:** `helmet` (HTTP Headers) & `@nestjs/throttler` (Rate Limiting)
- **Manejo de Errores:** Filtro global de excepciones personalizado (`HttpExceptionFilter`)
- **Contenedorización:** Docker & Docker Compose

---

## 📁 Arquitectura del Proyecto

El proyecto sigue una arquitectura modular en NestJS con separación clara de responsabilidades:

```text
src/
├── main.ts                     # Punto de entrada (Pipes globales, Helmet, CORS, Throttler)
├── app.module.ts               # Módulo raíz e integración de Mongoose & ConfigModule
├── common/                     # Utilidades compartidas y filtros globales de excepciones
├── auth/                       # Autenticación JWT, Estrategia Passport, Guards y Roles
├── users/                      # Gestión de usuarios, esquemas y DTOs
├── categories/                 # Categorías de productos
├── products/                   # Catálogo de productos
├── cart/                       # Carrito de compras persistente por usuario
└── orders/                     # Creación, consulta y cambio de estados de pedidos
```

---

## 🔐 Seguridad y Funcionalidades Principales

### 1. Autenticación y Autorización (RBAC)
- Encriptación segura de contraseñas con `bcrypt`.
- Emisión y validación de tokens JWT mediante `JwtAuthGuard` y `JwtStrategy`.
- Decorador personalizado `@Roles()` y `RolesGuard` para proteger rutas según el rol (`ADMIN`, `CLIENT`, `DELIVERY`).

### 2. Protección & Rate Limiting
- **Helmet:** Encabezados de seguridad HTTP habilitados.
- **Throttler Guard:** Protección anti-fuerza bruta (Límite: 10 peticiones por minuto por cliente).
- **ValidationPipe Global:** Limpieza estricta de payloads (`whitelist`, `forbidNonWhitelisted`, `transform`).

---

## 📡 Módulos y Endpoints de la API

### 🔑 Autenticación (`/auth`)
| Método | Endpoint | Protección | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Pública | Iniciar sesión y obtener el token JWT |

### 👤 Usuarios (`/users`)
| Método | Endpoint | Protección | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/users` | Pública | Registro de nuevos usuarios |
| `GET` | `/users` | JWT + Admin | Obtener lista completa de usuarios |
| `GET` | `/users/:id` | JWT | Obtener detalles de un usuario |
| `PATCH` | `/users/:id` | JWT | Actualizar datos del usuario |
| `DELETE` | `/users/:id` | JWT + Admin | Eliminar un usuario |

### 🏷️ Categorías (`/categories`)
| Método | Endpoint | Protección | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/categories` | Pública | Obtener todas las categorías |
| `GET` | `/categories/:id` | Pública | Obtener categoría por ID |
| `POST` | `/categories` | JWT + Admin | Crear nueva categoría |
| `PATCH` | `/categories/:id` | JWT + Admin | Editar categoría existente |
| `DELETE` | `/categories/:id` | JWT + Admin | Eliminar categoría |

### 🍕 Productos (`/products`)
| Método | Endpoint | Protección | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/products` | Pública | Listar todos los productos del catálogo |
| `GET` | `/products/:id` | Pública | Obtener detalles de un producto |
| `POST` | `/products` | JWT + Admin | Crear un nuevo producto |
| `PATCH` | `/products/:id` | JWT + Admin | Actualizar un producto |
| `DELETE` | `/products/:id` | JWT + Admin | Eliminar un producto |

### 🛒 Carrito de Compras (`/cart`)
| Método | Endpoint | Protección | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/cart` | JWT | Obtener el carrito del usuario autenticado |
| `POST` | `/cart/add` | JWT | Agregar/actualizar producto en el carrito |
| `DELETE` | `/cart/remove` | JWT | Eliminar producto específico del carrito |
| `DELETE` | `/cart/clear` | JWT | Vaciar el carrito completo |

### 📦 Pedidos (`/orders`)
| Método | Endpoint | Protección | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/orders` | JWT | Crear pedido a partir del carrito actual |
| `GET` | `/orders/me` | JWT | Historial de pedidos del cliente (paginado, con filtros) |
| `GET` | `/orders/:id` | JWT | Ver detalle de un pedido (dueño o Admin) |
| `PATCH` | `/orders/:id/cancel` | JWT | Cancelar un pedido propio (solo en estado `PENDING`) |
| `GET` | `/orders` | JWT + Admin | Ver todos los pedidos (paginado, con filtros) |
| `PATCH` | `/orders/:id/status` | JWT + Admin | Cambiar estado del pedido (`PENDING` → `CONFIRMED` → `PREPARING` → `OUT_FOR_DELIVERY` → `DELIVERED` / `CANCELLED`) |

---

## ⚙️ Configuración y Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto backend con la siguiente configuración:

```env
PORT=3000
MONGO_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&wMode=majority
JWT_SECRET=tu_clave_secreta_super_segura
```

---

## 🛠️ Instalación y Ejecución

### Desarrollo Local

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor en modo desarrollo (Watch mode)
npm run start:dev
```

### Ejecución con Docker

```bash
# Construir la imagen de Docker
docker build -t delivery-backend .

# Correr el contenedor pasando las variables de entorno
docker run -p 3000:3000 --env-file .env delivery-backend
```

---

## 📌 Estado del Proyecto (Progreso Real)

- ✅ **Fase 0.1 (Auth)**: Autenticación JWT, Refresh Tokens, y flujos de recuperación de contraseñas.
- ✅ **Fase 0.2 (Users)**: CRUD de usuarios con validaciones de email duplicado, Ownership Guards, prevención de Inyección de Roles, paginación (`PaginationQueryDto`) y documentación en Swagger.
- ✅ **Fase 0.3 (Categories)**: Endpoints protegidos, manejo de excepciones (`NotFoundException`), validación de Mongo IDs con `ParseMongoIdPipe`, paginación y Tests Unitarios.
- ✅ **Fase 0.4 (Products)**: Índices de texto y búsqueda avanzada, paginación con filtros (`ProductPaginationDto`), validaciones y Tests Unitarios.
- ✅ **Fase 0.5 (Cart)**: Carrito de compras con endpoints documentados, validación de cantidad y tests unitarios de cobertura completa.
- ✅ **Fase 0.6 (Orders)**: Paginación con filtros (estado y fechas), detalle de pedido protegido (`GET /orders/:id`), cancelación por cliente (`PATCH /orders/:id/cancel`), vaciado automático del carrito post-checkout, `ParseMongoIdPipe`, Swagger y 14 Tests Unitarios.

*Siguiente paso: Fase 0.7 — Expandir el módulo `common/` (TransformInterceptor, RequestLogger, PaginationUtil).*

*Nota: La arquitectura base, conexión a MongoDB, validaciones globales, Rate Limiting y Dockerización ya se encuentran integrados.*

