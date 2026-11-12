# 🎨 Roadmap Definitivo — Delivery Frontend (Multi-Rol: Cliente, Repartidor y Admin)

Guía arquitectónica y de implementación ordenada **fase por fase** para construir el Frontend completo de la plataforma **App Delivery**, conectando el **100% de los módulos, endpoints y WebSockets** construidos en las Fases 0 a 6 del Backend (`delivery-backend`) bajo los estándares de diseño de **`ui-ux-pro-max`**.

> [!IMPORTANT]
> **Estrategia del Proyecto:** Las fases de **Despliegue en AWS (ECS Fargate)** y **Kubernetes (K8s)** quedan programadas para el cierre del proyecto completo, de modo que despleguemos tanto el **Backend** como el **Frontend** integrados de extremo a extremo.

---

## 📍 Punto de Partida (Lo que ya tenemos en el Backend)

- ✅ **API RESTful en NestJS 11 (`http://localhost:3000/api/v1`)** con contrato global `{ success: true, data, timestamp }` (`TransformInterceptor`) y errores trazables con `requestId` (`HttpExceptionFilter`).
- ✅ **Autenticación y Seguridad:** JWT (`accessToken` 15m + `refreshToken` 7d con rotación), RBAC (`CLIENT`, `DELIVERY`, `ADMIN`), `OwnershipGuard`, `Throttle` y recuperación de contraseña.
- ✅ **16 Módulos Operativos:** `auth`, `users`, `categories`, `products`, `cart`, `orders`, `addresses`, `uploads` (AWS S3), `payments` (MercadoPago), `mail` (Nodemailer), `notifications` (Firebase FCM), `delivery`, `events` (Socket.io), `reviews`, `coupons`, `queues` (BullMQ + Redis) y `analytics`.
- ✅ **Caché y Tiempo Real:** Redis en categorías/productos y `EventsGateway` emitiendo `order_status_updated` y `delivery_location_updated`.

---

## 🛠️ Stack Tecnológico del Frontend (`delivery-frontend/`)

| Capa | Tecnología | Justificación Técnica |
|------|------------|-----------------------|
| **Core & Build** | **React 18+ · TypeScript · Vite** | Arranque instantáneo con HMR, tipado estricto de punta a punta con los DTOs del backend. |
| **Estilos & Sistema UI** | **Tailwind CSS · shadcn/ui (Radix) · Lucide React** | Componentes accesibles (WAI-ARIA), soporte nativo Light/Dark Mode e íconos vectoriales consistentes (**0 emojis como íconos**). |
| **Animaciones** | **Framer Motion** | Micro-interacciones fluidas (`150-300ms`), transiciones del Drawer del carrito y stepper de pedidos en vivo. |
| **Enrutamiento** | **React Router v6/v7** | Rutas anidadas, carga diferida (`lazy`) y Guards de protección por rol (`CLIENT`, `DELIVERY`, `ADMIN`). |
| **Estado del Servidor** | **TanStack Query (React Query v5) + Axios** | Caché inteligente en cliente, *Optimistic Updates* en el carrito, revalidación automática e interceptores JWT con *Silent Refresh*. |
| **Estado Global Cliente** | **Zustand** | Estado ligero y persistido para la sesión de usuario, dirección de entrega activa, UI del carrito y tema visual. |
| **Formularios & Validación** | **React Hook Form + Zod** | Validación reactiva sin re-renders innecesarios, replicando las reglas de `class-validator` del backend. |
| **Tiempo Real & Push** | **Socket.io-client · Firebase Web SDK (FCM)** | Conexión persistente con `EventsGateway` para tracking en vivo y recepción de notificaciones push en el navegador. |
| **Mapas & Geolocalización** | **Leaflet + React-Leaflet (OpenStreetMap)** | Selección de coordenadas de entrega, visualización de ruta y movimiento del repartidor en tiempo real sin costos de licencia. |
| **Visualización de Datos** | **Recharts** | Gráficos interactivos y responsivos para el módulo `/analytics` del panel de administración. |
| **Testing & Calidad** | **Vitest · Testing Library · Playwright** | Pruebas unitarias de componentes/hooks y pruebas E2E de los flujos críticos de los 3 roles. |

---

## 🎭 Sistema de Diseño Oficial (`ui-ux-pro-max`)

Siguiendo las directrices de la habilidad **`ui-ux-pro-max`**, la aplicación combina **dos lenguajes visuales complementarios** bajo una misma identidad de marca:
1. **Vibrant & Appetizing Bento (Marketplace Cliente):** Fotografías gastronómicas protagonistas, tarjetas con bordes suaves (`rounded-2xl`), sombras cálidas sutiles y micro-animaciones al agregar al carrito.
2. **Clean High-Contrast Glassmorphism (Rider App & Admin Dashboard):** Claridad operativa, indicadores de estado semánticos de alto contraste (`WCAG AA/AAA`), mapas a pantalla completa y paneles de métricas estilo *Bento Grid*.

### 🎨 Paleta de Colores Semántica

| Rol Semántico | Light Mode | Dark Mode | Uso en la Plataforma |
|---------------|------------|-----------|----------------------|
| **Primary (Brand / Appetizing)** | `#EA580C` (`orange-600`) | `#F97316` (`orange-500`) | CTAs principales ("Agregar al carrito", "Pagar"), badges destacados y marca. |
| **Primary Accent (Crimson)** | `#DC2626` (`red-600`) | `#EF4444` (`red-500`) | Descuentos, ofertas relámpago y alertas de urgencia. |
| **Secondary (Live Tracking)** | `#2563EB` (`blue-600`) | `#3B82F6` (`blue-500`) | Rutas en mapa, estado `OUT_FOR_DELIVERY`, interfaz de navegación del repartidor. |
| **Success (Delivered / Online)** | `#16A34A` (`green-600`) | `#22C55E` (`green-500`) | Estado `DELIVERED`, cupón aplicado, repartidor "Disponible / En línea". |
| **Warning (Rating / Kitchen)** | `#D97706` (`amber-600`) | `#F59E0B` (`amber-500`) | Estrellas de reseñas (`1-5`), estado `PREPARING` / `PENDING`. |
| **Background / Surface** | `#F8FAFC` / `#FFFFFF` | `#020617` / `#0F172A` | Fondos generales (`Slate-50`/`Slate-950`) y tarjetas (`White`/`Slate-900`). |
| **Text Primary / Muted** | `#0F172A` / `#475569` | `#F8FAFC` / `#94A3B8` | Contraste mínimo garantizado > 4.5:1 (cuerpo) y > 7:1 (títulos). |

### 🔤 Tipografía (`Google Fonts`)
- **Headings (`Outfit`):** Geométrica, moderna y con personalidad para títulos de secciones, nombres de platos, precios y KPIs (`font-semibold` / `font-bold`, `tracking-tight`).
- **Body (`Plus Jakarta Sans` / `Nunito Sans`):** Legibilidad óptima en descripciones de ingredientes, direcciones, tablas de órdenes y formularios.

### 📏 Checklist de Reglas de Oro (`ui-ux-pro-max`)
- **Prohibido usar emojis como íconos de UI:** Usar exclusivamente `lucide-react` con tamaño y trazo consistentes (`w-5 h-5`, `strokeWidth={1.75}`).
- **Cero Layout Shift (CLS = 0):** Todas las imágenes de productos/categorías deben tener `aspect-ratio` fijo (`aspect-square` o `aspect-[4/3]`) y `Skeleton` mientras cargan desde S3/CloudFront.
- **Feedback Interactivo Obligatorio:** `cursor-pointer` en todo elemento clicable, transiciones suaves (`transition-all duration-200`) y estados `:focus-visible` claros para accesibilidad por teclado.

---

## 🏗️ Arquitectura de Carpetas (`delivery-frontend/`)

```text
delivery-frontend/
├── public/
│   ├── manifest.json                   # Configuración PWA instalable
│   └── firebase-messaging-sw.js        # Service Worker para Push Notifications (FCM)
├── src/
│   ├── api/
│   │   ├── axios.client.ts             # Instancia Axios + desenvoltura TransformInterceptor + Refresh Token Queue
│   │   └── endpoints/                  # Clientes tipados por módulo del backend (13 servicios)
│   │       ├── auth.api.ts
│   │       ├── users.api.ts
│   │       ├── categories.api.ts
│   │       ├── products.api.ts
│   │       ├── cart.api.ts
│   │       ├── addresses.api.ts
│   │       ├── coupons.api.ts
│   │       ├── orders.api.ts
│   │       ├── payments.api.ts
│   │       ├── reviews.api.ts
│   │       ├── delivery.api.ts
│   │       ├── uploads.api.ts
│   │       └── analytics.api.ts
│   ├── types/                          # Interfaces TypeScript espejo de los Schemas/DTOs de NestJS
│   │   ├── api.types.ts                # ApiResponse<T>, PaginatedResponse<T>, ApiError
│   │   ├── auth.types.ts
│   │   ├── catalog.types.ts
│   │   ├── order.types.ts
│   │   ├── delivery.types.ts
│   │   └── analytics.types.ts
│   ├── store/                          # Estado global ligero con Zustand
│   │   ├── useAuthStore.ts             # Usuario activo, tokens, rol y permisos
│   │   ├── useCartDrawerStore.ts       # Control de apertura/cierre del carrito y dirección activa
│   │   └── useThemeStore.ts            # Light / Dark / System mode
│   ├── hooks/                          # Custom Hooks (TanStack Query + WebSockets + Geolocation)
│   │   ├── queries/                    # useProducts, useCategories, useCart, useOrders, useAnalytics...
│   │   ├── useSocket.ts                # Conexión autenticada con EventsGateway (Socket.io)
│   │   ├── useGeolocation.ts           # Tracking GPS del repartidor (real + simulador)
│   │   └── useDebounce.ts              # Búsqueda instantánea sin saturar la API
│   ├── components/
│   │   ├── ui/                         # Design System base (Button, Input, Badge, Modal, Drawer, Skeleton, Toast)
│   │   ├── layout/                     # Navbar, BottomNav móvil, Sidebar Admin, ThemeToggle, AddressSelector
│   │   ├── catalog/                    # ProductCard, CategoryPills, ProductFilters, ProductDetailModal
│   │   ├── cart/                       # CartDrawer, CartItemRow, CouponInputBox, OrderSummaryCard
│   │   ├── orders/                     # OrderStatusStepper, LiveTrackingMap, OrderCard, ReviewFormModal
│   │   ├── delivery/                   # AvailabilitySwitch, AvailableOrderCard, ActiveDeliveryMap, RiderStatsBento
│   │   └── admin/                      # KpiBentoGrid, SalesChart, TopProductsTable, ImageDropzoneS3, OrderKanban
│   ├── pages/
│   │   ├── auth/                       # LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage
│   │   ├── client/                     # HomePage, CatalogPage, CheckoutPage, PaymentResultPage, MyOrdersPage, OrderTrackingPage, ProfilePage
│   │   ├── delivery/                   # RiderOnboardingPage, RiderDashboardPage, ActiveDeliveryPage, RiderStatsPage
│   │   └── admin/                      # AdminAnalyticsPage, AdminOrdersPage, AdminProductsPage, AdminCategoriesPage, AdminCouponsPage, AdminUsersPage
│   ├── routes/
│   │   ├── AppRouter.tsx               # Definición de rutas con Code Splitting (React.lazy)
│   │   ├── ProtectedRoute.tsx          # Verifica sesión JWT válida
│   │   └── RoleGuard.tsx               # Restringe rutas por Role ('CLIENT' | 'DELIVERY' | 'ADMIN')
│   └── utils/
│       ├── cn.ts                       # clsx + tailwind-merge
│       ├── formatters.ts               # Moneda (COP/USD), fechas relativas y distancias (km)
│       └── sound.ts                    # Alertas sonoras sintetizadas (Web Audio API) para nuevos estados/pedidos
├── tests/                              # Suites de pruebas Unitarias (Vitest) y E2E (Playwright)
├── Dockerfile                          # Multi-stage (Node 20 build -> Nginx Alpine)
└── .env.example                        # Variables VITE_API_URL, VITE_WS_URL, VITE_FIREBASE_*
```

---

## 🔧 FASE 0 — Arquitectura Base, Design System (`ui-ux-pro-max`) y Cliente HTTP
**Duración estimada:** 1 semana  
**Objetivo:** Levantar los cimientos técnicos del frontend, el sistema de diseño visual y la capa de comunicación blindada con el backend de NestJS.

### Tareas de la Fase 0

| # | Tarea | Detalle Técnico |
|---|-------|-----------------|
| 1 | **Inicializar Proyecto Vite + TS** | Crear `delivery-frontend/` con `React 18+`, `TypeScript` estricto y configurar alias de importación `@/*` hacia `./src/*`. |
| 2 | **Configurar Tailwind + Tokens `ui-ux-pro-max`** | Configurar fuentes (`Outfit` y `Plus Jakarta Sans`), variables CSS para Light/Dark Mode, paleta semántica y utilidades `clsx` + `tailwind-merge` (`cn.ts`). |
| 3 | **Contratos Globales TypeScript (`api.types.ts`)** | Tipar la respuesta estándar del `TransformInterceptor` (`{ success: boolean; data: T; timestamp: string }`), la interfaz `PaginatedResponse<T>` (`data` + `meta: { total, page, lastPage }`) y el formato de error de `HttpExceptionFilter` (`requestId`, `statusCode`, `message`). |
| 4 | **Cliente Axios + Silent Refresh Queue** | Crear `axios.client.ts` con `baseURL: import.meta.env.VITE_API_URL` (`http://localhost:3000/api/v1`). Interceptor de request que inyecta `Authorization: Bearer <accessToken>`. Interceptor de response que desenvuelve `response.data.data` automáticamente y, ante un `401 Unauthorized`, ejecuta `POST /auth/refresh` encolando las peticiones pendientes sin cerrar la sesión del usuario. |
| 5 | **Componentes Base del Design System (`src/components/ui/`)** | Construir el kit base siguiendo `ui-ux-pro-max`: `Button` (variantes + estado `isLoading`), `Input` (con label, ícono y mensaje de error accesible), `Badge` (para estados de orden), `Modal`, `Drawer` (panel lateral deslizable), `Skeleton` y sistema de notificaciones `Toast` (Sonner / Hot-Toast). |
| 6 | **Layouts Multi-Rol y Health Check** | Crear `ClientLayout` (Navbar flotante + CartDrawer + Footer), `DeliveryLayout` (Mobile-first con Bottom Navigation) y `AdminLayout` (Sidebar colapsable + Topbar). Conectar un indicador discreto de estado del servidor contra `GET /api/v1/health`. |

### ✅ Checklist Fase 0
- [ ] Proyecto `delivery-frontend` corriendo en `http://localhost:5173` y CORS permitido en el backend (`ALLOWED_ORIGINS`).
- [ ] Tema Claro / Oscuro funcionando sin parpadeos y respetando contraste WCAG AA.
- [ ] `axios.client.ts` desenvolviendo `{ success, data, timestamp }` y rotando el Refresh Token automáticamente.
- [ ] Kit de componentes UI base renderizando con íconos SVG de `lucide-react`.

---

## 🔑 FASE 1 — Autenticación, Seguridad de Sesión y Perfil (`auth/` + `users/` + `uploads/`)
**Duración estimada:** 1 semana  
**Objetivo:** Implementar todo el ciclo de vida de identidad del usuario, control de acceso por roles (`RBAC`) y gestión del perfil propio con subida de avatar a S3.

### Endpoints del Backend que se integran en esta fase
- `POST /api/v1/auth/register` · `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh` · `POST /api/v1/auth/logout`
- `POST /api/v1/auth/forgot-password` · `POST /api/v1/auth/reset-password`
- `GET /api/v1/users/:id` · `PATCH /api/v1/users/:id`
- `POST /api/v1/uploads/avatars`

### Tareas de la Fase 1

| # | Tarea | Detalle Técnico |
|---|-------|-----------------|
| 1 | **Store de Autenticación (`useAuthStore.ts`)** | Guardar `user` (`id`, `name`, `email`, `role`, `avatar`), `accessToken` y `refreshToken`. Hidratar estado al iniciar la app y decodificar claims del JWT. |
| 2 | **Vistas de Login y Registro** | Formularios con `React Hook Form` + `Zod`. Manejo del rate limit (`429 Too Many Requests` del `@Throttle` del backend mostrando cuenta regresiva amigable). |
| 3 | **Flujo de Recuperación de Contraseña** | Vista `ForgotPasswordPage` (`POST /auth/forgot-password`) y vista `ResetPasswordPage` que captura el `?token=` de la URL y envía `POST /auth/reset-password`. |
| 4 | **Guards de Navegación (`ProtectedRoute` y `RoleGuard`)** | Redirigir usuarios no autenticados a `/login` guardando la ruta de origen (`location.state.from`). Redirigir automáticamente según el rol tras iniciar sesión (`CLIENT` → `/`, `DELIVERY` → `/delivery`, `ADMIN` → `/admin`). |
| 5 | **Página de Mi Perfil + Avatar en AWS S3** | Permitir al usuario editar sus datos (`PATCH /users/:id` protegido por `OwnershipGuard` en el backend) y subir su foto de perfil mediante `POST /uploads/avatars` (`multipart/form-data`, validando en cliente `jpg/png/webp` $\le 5\text{MB}$ antes de enviar). |
| 6 | **Logout Seguro** | Al cerrar sesión, invocar `POST /auth/logout` enviando el `refreshToken` para invalidarlo en MongoDB, limpiar la caché de `TanStack Query` y vaciar el `useAuthStore`. |

### ✅ Checklist Fase 1
- [ ] Registro e inicio de sesión completos con validaciones Zod.
- [ ] Rotación transparente de `accessToken` al expirar (15 min) usando `POST /auth/refresh`.
- [ ] Flujo completo de recuperación y reseteo de contraseña probado de punta a punta.
- [ ] Redirección y bloqueo de rutas según rol (`CLIENT`, `DELIVERY`, `ADMIN`).
- [ ] Actualización de perfil y subida de avatar a S3 funcionando.

---

## 🍕 FASE 2 — Catálogo Gastronómico, Búsqueda Avanzada y Reseñas (`categories/` + `products/` + `reviews/`)
**Duración estimada:** 1.5 semanas  
**Objetivo:** Construir una experiencia de descubrimiento de platos rápida, apetitosa y conectada a los filtros, ordenamientos e índices de MongoDB + Redis del backend.

### Endpoints del Backend que se integran en esta fase
- `GET /api/v1/categories` · `GET /api/v1/categories/:id`
- `GET /api/v1/products` (con `page`, `limit`, `search`, `categoryId`, `minPrice`, `maxPrice`, `available`, `sortBy`, `sortOrder`)
- `GET /api/v1/products/:id`
- `GET /api/v1/reviews/product/:productId`

### Tareas de la Fase 2

| # | Tarea | Detalle Técnico |
|---|-------|-----------------|
| 1 | **Home del Cliente y Carrusel de Categorías** | Banner Hero de alto impacto + barra horizontal interactiva de categorías (`GET /categories`) con scroll suave y selección instantánea. |
| 2 | **Buscador Reactivo con Debounce + URL Sync** | Barra de búsqueda con `useDebounce` (`350ms`) sincronizada con los query params de la URL (`?search=hamburguesa&categoryId=...&sortBy=price&sortOrder=asc`) para que las búsquedas sean compartibles por enlace. |
| 3 | **Panel de Filtros y Ordenamiento Dinámico** | Filtros por rango de precio (`minPrice`, `maxPrice`), switch de "Solo disponibles" (`available=true`) y selector de ordenamiento (`sortBy`: precio, fecha, nombre + `sortOrder`: `asc`/`desc`) aprovechando las mejoras de la Fase 6 del backend. |
| 4 | **Grid de Productos (`ProductCard`) + Skeletons** | Tarjetas con imagen optimizada, badge de categoría, precio formateado, estado "Agotado" si `available === false` y botón de adición rápida al carrito. Mostrar `ProductCardSkeleton` durante la carga. |
| 5 | **Paginación Inteligente** | Componente de paginación conectado a `meta: { total, page, lastPage }` retornado por la utilidad `paginate()` del backend. |
| 6 | **Modal / Vista de Detalle de Producto + Reseñas Públicas** | Al hacer clic en un plato (`GET /products/:id`), mostrar su descripción completa, selector de cantidad y cargar en paralelo sus reseñas públicas (`GET /reviews/product/:productId`) calculando el promedio de estrellas y distribución de calificaciones. |

### ✅ Checklist Fase 2
- [ ] Carrusel de categorías y grilla de productos renderizando datos reales cacheados en Redis.
- [ ] Búsqueda por texto, filtro por categoría, rango de precios y ordenamiento sincronizados con la URL.
- [ ] Paginación funcionando correctamente con los metadatos del backend.
- [ ] Vista de detalle del producto mostrando reseñas y promedio de calificación.

---

## 🛒 FASE 3 — Carrito Persistente, Direcciones con Mapa y Cupones (`cart/` + `addresses/` + `coupons/`)
**Duración estimada:** 1.5 semanas  
**Objetivo:** Permitir al cliente armar su pedido con fluidez (*Optimistic UI*), gestionar su libreta de direcciones sobre un mapa interactivo y validar cupones promocionales antes de pagar.

### Endpoints del Backend que se integran en esta fase
- `GET /api/v1/cart` · `POST /api/v1/cart/add` · `DELETE /api/v1/cart/remove` · `DELETE /api/v1/cart/clear`
- `GET /api/v1/addresses` · `POST /api/v1/addresses` · `GET /api/v1/addresses/:id` · `PATCH /api/v1/addresses/:id` · `DELETE /api/v1/addresses/:id`
- `POST /api/v1/coupons/apply`

### Tareas de la Fase 3

| # | Tarea | Detalle Técnico |
|---|-------|-----------------|
| 1 | **Slide-over Cart Drawer (`CartDrawer.tsx`)** | Cajón lateral accesible desde cualquier pantalla con contador animado en el Navbar. Sincronizado con `GET /cart`. |
| 2 | **Mutaciones Optimistas del Carrito** | Configurar `useMutation` en TanStack Query para `POST /cart/add`, `DELETE /cart/remove` y `DELETE /cart/clear` actualizando la UI al instante y haciendo *rollback* automático si el servidor reporta error. |
| 3 | **Libreta de Direcciones (`AddressesModal` / Página)** | CRUD completo conectado a `/api/v1/addresses`. Permitir etiquetar direcciones ("Casa", "Oficina", "Pareja"), agregar referencias de entrega y marcar una dirección como predeterminada (`isDefault`). |
| 4 | **Selector de Coordenadas en Mapa (`React-Leaflet`)** | Integrar mapa interactivo con marcador arrastrable + botón *"Usar mi ubicación actual"* (`navigator.geolocation`) para capturar `latitude` y `longitude` exactas al crear o editar una dirección. |
| 5 | **Validador de Cupones Promocionales (`CouponInputBox`)** | Campo de código promocional que llama a `POST /coupons/apply` con `{ code, orderTotal }`. Mostrar animación de éxito con el monto ahorrado (`discount` y `finalTotal`) o el motivo exacto de rechazo del backend (cupón expirado, monto mínimo no alcanzado, ya usado por este usuario). |

### ✅ Checklist Fase 3
- [ ] Agregar, incrementar, disminuir, eliminar productos y vaciar carrito funcionando en tiempo real con el backend.
- [ ] Creación, edición, eliminación y selección de direcciones de envío con mapa interactivo.
- [ ] Aplicación de cupones (`PERCENTAGE` y `FIXED`) calculando el descuento real antes del checkout.

---

## 💳 FASE 4 — Checkout, Pasarela MercadoPago, Mis Pedidos y Reseñas (`orders/` + `payments/` + `reviews/`)
**Duración estimada:** 1.5 semanas  
**Objetivo:** Cerrar el ciclo de compra desde la confirmación del pedido y el pago seguro con MercadoPago hasta la gestión del historial de órdenes, cancelaciones y reseñas verificadas.

### Endpoints del Backend que se integran en esta fase
- `POST /api/v1/orders` · `POST /api/v1/orders/:id/pay`
- `GET /api/v1/orders/me` · `GET /api/v1/orders/:id` · `PATCH /api/v1/orders/:id/cancel`
- `POST /api/v1/reviews` · `DELETE /api/v1/reviews/:id`

### Tareas de la Fase 4

| # | Tarea | Detalle Técnico |
|---|-------|-----------------|
| 1 | **Página de Checkout (`CheckoutPage.tsx`)** | Resumen final con: 1) Dirección de entrega seleccionada, 2) Lista de productos del carrito activo, 3) Cupón aplicado, y 4) Desglose transparente del total. |
| 2 | **Creación de Orden y Redirección a MercadoPago** | Al confirmar el pedido: ejecutar `POST /orders` (que vacía automáticamente el carrito en el backend y retorna la orden en `PENDING`) e inmediatamente invocar `POST /orders/:id/pay` para redirigir al usuario al `init_point` / `sandbox_init_point` de MercadoPago. |
| 3 | **Vistas de Retorno de Pago (`PaymentResultPage.tsx`)** | Pantallas dedicadas para el regreso desde MercadoPago (`success`, `failure`, `pending`) con acceso directo al tracking del pedido o botón para reintentar el pago (`POST /orders/:id/pay`). |
| 4 | **Historial de Mis Pedidos (`MyOrdersPage.tsx`)** | Conectado a `GET /orders/me` con filtros por estado (`PENDING`, `CONFIRMED`, `PREPARING`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`), filtro por rango de fechas (`dateFrom`, `dateTo`) y paginación. |
| 5 | **Cancelación de Pedido por el Cliente** | En el detalle de la orden (`GET /orders/:id`), habilitar el botón *"Cancelar Pedido"* con modal de confirmación **únicamente** cuando `order.status === 'PENDING'`, llamando a `PATCH /orders/:id/cancel`. |
| 6 | **Calificación de Productos Entregados (`ReviewFormModal`)** | Cuando una orden alcanza el estado `DELIVERED`, habilitar en cada ítem de la orden el botón *"Calificar Producto"* (selector interactivo de 1 a 5 estrellas + comentario) conectado a `POST /reviews` (que en el backend valida que el pedido esté `DELIVERED` y evita duplicados mediante el índice único `{ user, product, order }`). |

### ✅ Checklist Fase 4
- [ ] Checkout creando la orden en MongoDB y vaciando el carrito activo en el frontend.
- [ ] Flujo de pago con MercadoPago Sandbox redirigiendo y procesando el estado de la orden.
- [ ] Historial de pedidos del cliente con filtros de estado/fecha y paginación.
- [ ] Cancelación de pedido propio en estado `PENDING` funcionando.
- [ ] Creación de reseñas sobre productos de órdenes `DELIVERED` funcionando y validando no-duplicados.

---

## 📡 FASE 5 — Tiempo Real: WebSockets, Tracking en Mapa y Push Notifications (`events/` + `notifications/`)
**Duración estimada:** 1.5 semanas  
**Objetivo:** Conectar la experiencia en vivo del cliente mediante Socket.io y Firebase Cloud Messaging para que vea cómo avanza su pedido y dónde viene su repartidor sin recargar la página.

### Eventos WebSocket y Endpoints que se integran en esta fase
- Conexión Socket.io a `EventsGateway` (`handshake.headers.token = 'Bearer <accessToken>'`)
- Evento entrante `order_status_updated` (emitido desde el backend al cambiar estado)
- Evento entrante `delivery_location_updated` (emitido cuando el repartidor actualiza su GPS)
- `PATCH /api/v1/users/:id` (para registrar el `fcmToken` del navegador en el perfil del usuario)

### Tareas de la Fase 5

| # | Tarea | Detalle Técnico |
|---|-------|-----------------|
| 1 | **Servicio y Hook `useSocket.ts`** | Conectar automáticamente al `EventsGateway` cuando el usuario inicia sesión, enviando el JWT en `extraHeaders: { token: 'Bearer ...' }`. Reconectar automáticamente si el token se refresca o si cae la red. |
| 2 | **Stepper Animado de Estado en Vivo (`OrderStatusStepper`)** | En la vista `OrderTrackingPage` (`/orders/:id`), escuchar `order_status_updated`. Cuando llega el evento, invalidar/actualizar la caché de TanStack Query de esa orden, animar la transición al nuevo paso (`PENDING` → `CONFIRMED` → `PREPARING` → `OUT_FOR_DELIVERY` → `DELIVERED`), disparar un Toast informativo y reproducir un tono sutil con Web Audio API (`sound.ts`). |
| 3 | **Mapa de Tracking en Tiempo Real (`LiveTrackingMap`)** | Cuando la orden está en `OUT_FOR_DELIVERY`, mostrar un mapa con dos marcadores personalizados: el domicilio del cliente y el repartidor en movimiento. Escuchar `delivery_location_updated` y actualizar suavemente la posición `(latitude, longitude)` del repartidor en el mapa en vivo. |
| 4 | **Integración de Push Notifications (Firebase FCM)** | Configurar `firebase-messaging-sw.js` para solicitar permiso de notificaciones al navegador, obtener el token FCM y guardarlo en el usuario (`PATCH /users/:id`), permitiendo recibir las notificaciones push que encola **BullMQ (`NotificationsProcessor`)** incluso cuando la pestaña está en segundo plano. |

### ✅ Checklist Fase 5
- [ ] Conexión WebSocket autenticada uniéndose a la sala privada del `userId` en `EventsGateway`.
- [ ] Cambio de estado de una orden reflejándose en menos de 1 segundo en la pantalla del cliente sin refrescar.
- [ ] Movimiento del repartidor viéndose en tiempo real sobre el mapa interactivo.
- [ ] Notificaciones Toast + sonido + Push FCM funcionando.

---

## 🛵 FASE 6 — Portal del Repartidor / Rider App Mobile-First (`delivery/`)
**Duración estimada:** 1.5 semanas  
**Objetivo:** Construir la aplicación especializada para los usuarios con rol `DELIVERY`, optimizada para pantallas móviles, operación con una sola mano y transmisión de coordenadas GPS.

### Endpoints del Backend que se integran en esta fase
- `POST /api/v1/delivery/profile` · `GET /api/v1/delivery/profile`
- `PATCH /api/v1/delivery/availability`
- `PATCH /api/v1/delivery/location`
- `GET /api/v1/delivery/orders/available`
- `PATCH /api/v1/delivery/orders/:id/accept`
- `PATCH /api/v1/delivery/orders/:id/deliver`
- `GET /api/v1/delivery/stats`

### Tareas de la Fase 6

| # | Tarea | Detalle Técnico |
|---|-------|-----------------|
| 1 | **Onboarding del Repartidor (`RiderOnboardingPage`)** | Al entrar por primera vez como `DELIVERY`, consultar `GET /delivery/profile`. Si no tiene perfil creado (`404`), mostrar un asistente paso a paso para registrar su vehículo (`MOTORCYCLE`, `BICYCLE`, `CAR`), placa y teléfono (`POST /delivery/profile`). |
| 2 | **Switch Maestro de Disponibilidad (`AvailabilitySwitch`)** | Barra superior con interruptor de alto contraste *"En Línea / Desconectado"* conectado a `PATCH /delivery/availability`. |
| 3 | **Bolsa de Pedidos Disponibles (`AvailableOrderCard`)** | Listado con auto-refresco (`GET /delivery/orders/available`) mostrando los pedidos listos para recoger, dirección de destino, monto y botón táctil grande *"Aceptar Entrega"* (`PATCH /delivery/orders/:id/accept`). |
| 4 | **Vista de Entrega Activa + Emisor GPS (Real + Simulador)** | Mientras el repartidor tiene un pedido activo: mostrar mapa con la ruta al cliente y transmitir su ubicación mediante `PATCH /delivery/location`. Incluir un **"Modo Simulador de Ruta"** en la UI de desarrollo que mueva automáticamente las coordenadas paso a paso hacia el destino para que puedas probar el tracking en vivo desde tu PC sin tener que salir a caminar con el teléfono. |
| 5 | **Confirmación de Entrega y Dashboard de Estadísticas** | Botón de confirmación *"Marcar como Entregado"* (`PATCH /delivery/orders/:id/deliver`) y vista `RiderStatsPage` conectada a `GET /delivery/stats` mostrando total de entregas completadas, calificación y rendimiento en tarjetas Bento. |

### ✅ Checklist Fase 6
- [ ] Creación y lectura de perfil de repartidor funcionando para usuarios con rol `DELIVERY`.
- [ ] Toggle de disponibilidad Online/Offline actualizando estado en el backend.
- [ ] Aceptación de pedidos disponibles cambiando el estado a `OUT_FOR_DELIVERY`.
- [ ] Transmisión de coordenadas GPS (real con `navigator.geolocation` y simulada) moviendo el mapa del cliente en vivo.
- [ ] Cierre de entrega (`deliver`) y vista de estadísticas del repartidor funcionando.

---

## 📊 FASE 7 — Panel de Administración & Analytics Ejecutivo (`analytics/` + Admin CRUDs)
**Duración estimada:** 2 semanas  
**Objetivo:** Construir el centro de control completo para el rol `ADMIN`, integrando el motor de agregaciones de MongoDB (`/analytics`), el despacho de órdenes, el catálogo con AWS S3, los cupones y la administración de usuarios.

### Endpoints del Backend que se integran en esta fase
- `GET /api/v1/analytics/dashboard` · `GET /api/v1/analytics/sales` · `GET /api/v1/analytics/top-products`
- `GET /api/v1/orders` · `PATCH /api/v1/orders/:id/status`
- `POST /api/v1/uploads/:folder` (`products`, `categories`)
- CRUD Admin de `/categories`, `/products`, `/coupons`
- `GET /api/v1/users` · `PATCH /api/v1/users/:id/role` · `DELETE /api/v1/users/:id`

### Tareas de la Fase 7

| # | Tarea | Detalle Técnico |
|---|-------|-----------------|
| 1 | **Dashboard Ejecutivo de Analytics (`AdminAnalyticsPage`)** | 1) **Bento Grid de KPIs** (`GET /analytics/dashboard`): ingresos totales, órdenes totales, ticket promedio, usuarios registrados, productos activos y gráfico de dona de órdenes por estado. 2) **Gráfico de Evolución de Ventas** (`GET /analytics/sales` con `Recharts`) con selector de rango (`7`, `30`, `90` días). 3) **Ranking Top Productos** (`GET /analytics/top-products`) por unidades vendidas e ingresos generados. |
| 2 | **Centro de Despacho de Pedidos (`AdminOrdersPage`)** | Vista dual (Tabla filtrable + Tablero Kanban por estado) conectada a `GET /orders`. Permite al Admin avanzar el estado de los pedidos (`PATCH /orders/:id/status`: `PENDING` → `CONFIRMED` → `PREPARING` → `OUT_FOR_DELIVERY` → `DELIVERED` / `CANCELLED`), disparando en el backend las colas BullMQ y los WebSockets hacia el cliente. |
| 3 | **Gestor de Productos y Categorías con Drag & Drop a S3** | Tablas paginadas con modales/drawers de creación y edición (`POST/PATCH/DELETE` en `/products` y `/categories`). Componente `ImageDropzoneS3` que sube primero la foto a `POST /uploads/products` o `POST /uploads/categories`, muestra barra de progreso + vista previa, y asigna automáticamente la URL de S3 al formulario. |
| 4 | **Gestor de Cupones Promocionales (`AdminCouponsPage`)** | CRUD completo de `/coupons`: creación de cupones `PERCENTAGE` o `FIXED`, configuración de compra mínima (`minOrderAmount`), tope de descuento (`maxDiscount`), límite global de usos (`usageLimit`), selector de fecha de expiración y barra de progreso de uso actual (`usedCount / usageLimit`). |
| 5 | **Administración de Usuarios y Roles (`AdminUsersPage`)** | Tabla paginada conectada a `GET /users` con buscador, selector para ascender o cambiar el rol de cualquier usuario (`PATCH /users/:id/role` entre `CLIENT`, `DELIVERY` y `ADMIN`) y eliminación segura (`DELETE /users/:id`). |

### ✅ Checklist Fase 7
- [ ] Dashboard de Analytics renderizando KPIs, curva de ventas diarias y top productos reales desde MongoDB Aggregation Pipelines.
- [ ] Gestión de estados de órdenes desde Admin notificando en vivo al cliente por WebSocket y BullMQ.
- [ ] CRUD completo de Productos y Categorías con subida de imágenes reales a AWS S3.
- [ ] CRUD completo de Cupones Promocionales.
- [ ] Gestión de usuarios y cambio de roles (`CLIENT` ↔ `DELIVERY` ↔ `ADMIN`) funcionando.

---

## 🧪 FASE 8 — Testing (Unitario + E2E), PWA, Optimización y Dockerización
**Duración estimada:** 1.5 semanas  
**Objetivo:** Asegurar la calidad de producción del Frontend con pruebas automatizadas, soporte de aplicación web progresiva (PWA) y contenedorización lista para el despliegue final en AWS y Kubernetes.

### Tareas de la Fase 8

| # | Tarea | Detalle Técnico |
|---|-------|-----------------|
| 1 | **Tests Unitarios y de Componentes (`Vitest` + `Testing Library`)** | Pruebas unitarias de utilidades, stores (`useAuthStore`), formularios críticos (Login, Checkout, Aplicación de Cupón) y componentes de UI. |
| 2 | **Tests End-to-End Multi-Rol (`Playwright`)** | Flujo E2E automatizado que verifica el viaje completo: 1) Cliente agrega productos al carrito y crea pedido, 2) Admin lo confirma y pasa a cocina, 3) Repartidor lo acepta y lo entrega, 4) Cliente deja una reseña. |
| 3 | **Optimización de Bundle y PWA** | Code-splitting por rutas y roles (`React.lazy` + `Suspense`), configuración de `manifest.json` e íconos para que la app sea instalable en móviles (especialmente útil para Clientes y Repartidores). |
| 4 | **Dockerfile Multi-Stage + Nginx + Docker Compose** | Crear `delivery-frontend/Dockerfile` (`node:20-alpine` para build estático → `nginx:stable-alpine` non-root con compresión `gzip`, headers de caché y fallback SPA `try_files $uri /index.html`). Integrar el servicio `frontend` en el `docker-compose.yml` raíz del proyecto. |
| 5 | **Pipeline CI del Frontend (GitHub Actions)** | Agregar job de `lint`, `typecheck` (`tsc --noEmit`), `test` y `build` del frontend en `.github/workflows/ci.yml`. |

### ✅ Checklist Fase 8
- [ ] Suite de pruebas en Vitest y Playwright pasando en verde.
- [ ] Build de producción (`npm run build`) sin errores de TypeScript (`0 errors`) y con Code Splitting por rol.
- [ ] App instalable como PWA en móvil y escritorio.
- [ ] Contenedor Docker del frontend corriendo integrado junto al backend, MongoDB y Redis con `docker compose up -d`.

---

## 📊 Resumen Ejecutivo — Todas las Fases del Frontend

| Fase | Módulo / Objetivo | Módulos del Backend Conectados | Duración Estimada |
|------|-------------------|--------------------------------|-------------------|
| **Fase 0** | Arquitectura Base, Design System (`ui-ux-pro-max`) y Axios Refresh Queue | `common`, `health` | 1 semana |
| **Fase 1** | Autenticación, Guards por Rol y Perfil con Avatar en S3 | `auth`, `users`, `uploads` | 1 semana |
| **Fase 2** | Catálogo Gastronómico, Filtros Avanzados y Reseñas Públicas | `categories`, `products`, `reviews` | 1.5 semanas |
| **Fase 3** | Carrito Optimista, Direcciones con Mapa y Cupones | `cart`, `addresses`, `coupons` | 1.5 semanas |
| **Fase 4** | Checkout, Pasarela MercadoPago, Mis Pedidos y Calificaciones | `orders`, `payments`, `reviews` | 1.5 semanas |
| **Fase 5** | Tiempo Real: WebSockets, Tracking en Mapa y Push FCM | `events`, `notifications`, `queues` | 1.5 semanas |
| **Fase 6** | Portal del Repartidor / Rider App Mobile-First + GPS | `delivery`, `events` | 1.5 semanas |
| **Fase 7** | Panel Admin Ejecutivo: Analytics, Despacho, Catálogo S3, Cupones y Roles | `analytics`, `orders`, `products`, `categories`, `coupons`, `users`, `uploads` | 2 semanas |
| **Fase 8** | Testing (Vitest + Playwright), PWA y Dockerización con Nginx | Integración Full-Stack completa | 1.5 semanas |
| **Post-FE** | **Retomar Fase 7 y 8 del Proyecto General:** Despliegue Full-Stack en **AWS (ECS Fargate + S3/CloudFront)** y **Kubernetes** | Infraestructura Cloud Completa | 3-4 semanas |

---

> [!TIP]
> **Metodología de Trabajo (Modo Mentor):**  
> Igual que hicimos en el Backend, avanzaremos **fase por fase y paso a paso**. En cada fase te explicaré la arquitectura y los conceptos clave de React/TypeScript/UI, te daré los bloques de código explicados para que los implementes, **probaremos cada flujo en el navegador conectado a tu API real**, actualizaremos `STATUS.md` y los `README.md`, y cerraremos cada fase con su **commit detallado**.
