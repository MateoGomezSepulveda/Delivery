# 🎨 App Delivery – Frontend Multi-Rol (`delivery-frontend`)

Aplicación web moderna para la plataforma **App Delivery**, desarrollada con **React 18**, **TypeScript**, **Vite**, **Tailwind CSS**, **TanStack Query (React Query v5)** y **Zustand**, diseñada bajo los estándares de **`ui-ux-pro-max`**.

---

## 🚀 Stack Tecnológico

- **Core:** React 18 · TypeScript · Vite 6
- **Estilos & Design System (`ui-ux-pro-max`):** Tailwind CSS · `clsx` + `tailwind-merge` · Tipografía `Outfit` & `Plus Jakarta Sans` · Light/Dark Mode nativo
- **Iconografía:** `lucide-react` (100% íconos vectoriales SVG, cero emojis en UI)
- **Estado del Servidor & HTTP:** `@tanstack/react-query` v5 + `axios` (con desenvolvimiento automático de `TransformInterceptor` y **Silent Refresh Token Queue** ante errores `401`)
- **Estado Cliente:** `zustand` (persistencia de tema visual, carrito deslizable y sesión)
- **Enrutamiento Multi-Rol:** `react-router-dom` v6 (`ClientLayout`, `DeliveryLayout`, `AdminLayout`)
- **Notificaciones:** `sonner`

---

## ⚙️ Instalación y Ejecución Local

```bash
cd delivery-frontend

# 1. Instalar dependencias
npm install

# 2. Levantar servidor de desarrollo (http://localhost:5173)
npm run dev

# 3. Verificar linter ESLint y tipos TypeScript
npm run lint
npm run typecheck

# 4. Ejecutar pruebas unitarias y de componentes (Vitest)
npm run test

# 5. Ejecutar pruebas E2E multirrol (Playwright)
npm run test:e2e

# 6. Generar build de producción (PWA + bundles divididos)
npm run build
```

---

## 📌 Progreso de Fases (Frontend)

- ✅ **Fase 0 (Arquitectura Base, Design System `ui-ux-pro-max` y Core HTTP)**:
  - Configuración de Vite + React 18 + TypeScript con alias `@/*`.
  - Tokens de diseño `ui-ux-pro-max` (paleta semántica, tipografía `Outfit` + `Plus Jakarta Sans`, soporte Light/Dark Mode en `useThemeStore`).
  - Contratos globales en `src/types/api.types.ts` (`ApiResponse<T>`, `PaginatedResponse<T>`, `ApiErrorResponse`, `HealthCheckResponse`).
  - Cliente `axios.client.ts` con inyección de Bearer Token, desenvolvimiento automático de `{ success, data, timestamp }` y cola de rotación silenciosa de Refresh Token (`POST /auth/refresh`).
  - Kit de componentes UI base (`Button`, `Input`, `Badge`, `OrderStatusBadge`, `RoleBadge`, `Modal`, `Drawer`, `Skeleton`, `EmptyState`).
  - Layouts Multi-Rol (`ClientLayout`, `DeliveryLayout`, `AdminLayout`) e indicador de salud en tiempo real conectado a `GET /api/v1/health`.

- ✅ **Fase 1 (Autenticación, Seguridad de Sesión, RBAC y Perfil con S3)**:
  - Servicios tipados `auth.api.ts`, `users.api.ts` y `uploads.api.ts` (con conversión automática `<canvas>` de `.jfif`/`.jpeg`/`.avif` a `.jpg`) + utilidad `jwt.ts` para decodificar claims (`sub`, `email`, `role`, `exp`).
  - Store persistente `useAuthStore.ts` con hidratación automática de sesión contra `GET /api/v1/users/:id` y cierre de sesión seguro (`POST /api/v1/auth/logout`).
  - Vistas de identidad en `AuthLayout`: `LoginPage` (con manejo de Rate Limit `429` y redirección por rol), `RegisterPage` (con auto-login), `ForgotPasswordPage` (con soporte `devToken`) y `ResetPasswordPage`.
  - Guards de navegación `ProtectedRoute` y `RoleGuard` (`CLIENT`, `DELIVERY`, `ADMIN`).
  - Página `ProfilePage` (`/profile`) con edición de datos personales (`PATCH /users/:id`), cambio de contraseña, prueba manual de rotación de Refresh Token y subida de avatar a AWS S3 (`POST /uploads/avatars`).

- ✅ **Fase 2 (Catálogo Gastronómico, Búsqueda Avanzada y Reseñas Públicas)**:
  - Servicios `categories.api.ts`, `products.api.ts` (incluyendo sembrador automático `seedDemoCatalogApi`) y `reviews.api.ts`.
  - Vista `CatalogPage` (`/`) sincronizada con URL Query Params (`search`, `categoryId`, `minPrice`, `maxPrice`, `available`, `sortBy`, `sortOrder`, `page`) + hook `useDebounce`.
  - Componentes `CategoryPills`, `ProductFiltersBar`, `ProductCard`, `PaginationBar` y `ProductDetailModal` con promedio de estrellas y reseñas públicas (`GET /reviews/product/:productId`).

- ✅ **Fase 3 (Carrito Persistente, Libreta de Direcciones con Mapa y Cupones)**:
  - Servicios `cart.api.ts`, `addresses.api.ts` y `coupons.api.ts`.
  - `CartDrawer` conectado a `GET /cart`, `POST /cart/add`, `DELETE /cart/remove` y `DELETE /cart/clear` con contador en vivo en el Navbar.
  - `AddressesModal` con CRUD completo contra `/api/v1/addresses`, detección de ubicación GPS (`navigator.geolocation`), geocodificación inversa (Nominatim) y mapa interactivo OpenStreetMap.
  - `CouponInputBox` conectado a `POST /api/v1/coupons/apply` calculando ahorro y total final en tiempo real.

- ✅ **Fase 6 (Portal del Repartidor)**:
  - `delivery.api.ts`, `DeliveryLayout` (onboarding + disponibilidad), `/delivery` (pedidos disponibles), `/delivery/active` (emisor GPS/simulador) y `/delivery/stats`.

- ✅ **Fase 7 (Panel de Administración y Analytics)**:
  - `analytics.api.ts` y páginas `/admin` (dashboard), `/admin/orders` (Kanban), `/admin/products`, `/admin/categories`, `/admin/coupons` y `/admin/users`.

- ✅ **Fase 5 (Tiempo Real)**:
  - `useSocket.ts` (Socket.io con JWT en `auth.token`, reconexión al rotar token), `utils/sound.ts` (Web Audio API) y `LiveTrackingMap` en `/orders/:id` para órdenes `OUT_FOR_DELIVERY`.
  - Pendiente: Push FCM.

- ✅ **Fase 4 (Checkout, Pasarela MercadoPago, Mis Pedidos y Reseñas Verificadas)**:
  - Servicio `orders.api.ts` conectado a `POST /orders`, `GET /orders/me`, `GET /orders/:id`, `PATCH /orders/:id/cancel`, `POST /orders/:id/pay`, `GET /orders` y `PATCH /orders/:id/status`.
  - `CheckoutPage` (`/checkout`) en 3 pasos con selección de dirección, resumen del carrito activo, cupón promocional y redirección a MercadoPago Checkout Pro.
  - `PaymentResultPage` (`/payments/:status`) para las redirecciones `success`, `pending` y `failure` de MercadoPago.
  - `MyOrdersPage` (`/orders`) con filtros por estado (`OrderStatus`), rango de fechas (`dateFrom`, `dateTo`) y paginación.
  - `OrderDetailPage` (`/orders/:id`) con stepper de progreso, cancelación por cliente en estado `PENDING`, consola rápida de transición de estados (modo Admin) y `ReviewFormModal` (`POST /reviews`) para calificar productos en órdenes `DELIVERED`.

- ✅ **Fase 8 (Calidad, Testing, PWA, Code Splitting y Dockerización)**:
  - **ESLint 9 (`eslint.config.js`)** + scripts `lint`, `test`, `test:watch` y `test:e2e`.
  - **Tests Unitarios y de Componentes (Vitest + Testing Library + jsdom)**: `jwt.test.ts`, `formatters.test.ts`, `useAuthStore.test.ts`, `CouponInputBox.test.tsx` y `LoginPage.test.tsx`.
  - **Tests E2E Multirrol (`e2e/delivery-flow.spec.ts` con Playwright)**: flujo completo Cliente -> Admin -> Repartidor -> Cliente reseña.
  - **Performance & PWA**: `React.lazy` + `Suspense` en `AppRouter.tsx`, `manualChunks` en `vite.config.ts`, `public/manifest.webmanifest`, íconos SVG (`192`/`512`) y Service Worker (`public/sw.js`).
  - **Docker Producción (Non-Root)**: `Dockerfile` multi-stage con `nginxinc/nginx-unprivileged:1.27-alpine` en puerto `8080`, `nginx.conf` (Gzip, caché `/assets/`, `/healthz`, SPA fallback) y `.dockerignore`.
