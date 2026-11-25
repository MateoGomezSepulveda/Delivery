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

- ✅ **Fase 1 (Autenticación, Celular Obligatorio, Verificación Dual SMS/Gmail, OAuth 2.0, Seguridad de Sesión, RBAC y Perfil con S3)**:
  - Servicios tipados `auth.api.ts`, `users.api.ts` y `uploads.api.ts` (con conversión automática `<canvas>` de `.jfif`/`.jpeg`/`.avif` a `.jpg` y compresión de avatares a 320px persistidos en MongoDB) + utilidades `jwt.ts` y `phone.ts`.
  - Store persistente `useAuthStore.ts` con hidratación automática de sesión contra `GET /api/v1/users/:id`, migración silenciosa de avatares previos, limpieza total al cerrar sesión (`resetCartUi` + `queryClient.clear`) y cierre de sesión seguro (`POST /api/v1/auth/logout`).
  - Vistas de identidad en `AuthLayout`: `LoginPage` (Rate Limit `429`, redirección por rol y aviso de verificación pendiente), `RegisterPage` (celular obligatorio, selector **Correo Gmail / SMS al celular** y flujo en 2 pasos), `VerifyEmailPage` (6 casillas OTP, verificación por enlace `?token=...` y reenvío por Correo o SMS), `SocialAuthButtons` (**Google y Facebook OAuth 2.0** con exigencia de celular vía `CompletePhoneModal` / banner `ClientLayout` / bloqueo en `CheckoutPage`), `ForgotPasswordPage` y `ResetPasswordPage` (flujo real SMTP sin `devToken`).
  - Guards de navegación `ProtectedRoute` y `RoleGuard` (`CLIENT`, `DELIVERY`, `ADMIN`).
  - Página `ProfilePage` (`/profile`) con edición de datos personales y celular (`PATCH /users/:id`), badges de verificación de correo y celular, tarjeta de cuentas vinculadas Google/Facebook, modal ampliado de foto de perfil con subida a AWS S3 (`POST /uploads/avatars`) y activación de Socio Repartidor (`-10%` en 4 pedidos/mes).

- ✅ **Fase 2 (Catálogo Gastronómico, Búsqueda Avanzada y Reseñas Públicas)**:
  - Servicios `categories.api.ts`, `products.api.ts` (incluyendo sembrador automático `seedDemoCatalogApi`) y `reviews.api.ts`.
  - Vista `CatalogPage` (`/`) sincronizada con URL Query Params (`search`, `categoryId`, `minPrice`, `maxPrice`, `available`, `sortBy`, `sortOrder`, `page`) + hook `useDebounce`.
  - Componentes `CategoryPills`, `ProductFiltersBar`, `ProductCard`, `PaginationBar` y `ProductDetailModal` con promedio de estrellas y reseñas públicas (`GET /reviews/product/:productId`).

- ✅ **Fase 3 (Carrito Persistente, Libreta de Direcciones con Mapa y Cupones)**:
  - Servicios `cart.api.ts`, `addresses.api.ts` y `coupons.api.ts` + hook `useCartMutations.ts` (mutaciones optimistas con snapshot y rollback automático).
  - `CartDrawer` conectado a `GET /cart`, `POST /cart/add`, `DELETE /cart/remove` y `DELETE /cart/clear` con contador en vivo en el Navbar.
  - `AddressesModal` con CRUD completo contra `/api/v1/addresses`, detección de ubicación GPS (`navigator.geolocation`), geocodificación inversa (Nominatim) y mapa interactivo OpenStreetMap.
  - `CouponInputBox` conectado a `POST /api/v1/coupons/apply` calculando ahorro y total final en tiempo real.

- ✅ **Fase 6 (Portal del Repartidor)**:
  - `delivery.api.ts`, `DeliveryLayout` (aprobación `PENDING`/`APPROVED`/`REJECTED`, switch Online/Offline y conexión Socket.io en vivo `useSocket({ playRiderAlerts: isOnline })`), `/delivery` (pedidos disponibles con badge real de conexión/reconexión, bloqueo Offline y ganancia por `deliveryFee`), `/delivery/active` (emisor GPS/simulador, Llamar/WhatsApp, Google Maps/Waze, alertas contraentrega y modal de confirmación) y `/delivery/stats` (KPIs e historial paginado por costo de envío).

- ✅ **Fase 7 (Panel de Administración, Inventario/Stock y Analytics de Ganancias Reales)**:
  - `analytics.api.ts` y páginas `/admin` (dashboard financiero con ventas, costos de compra COGS, ganancia neta real, margen %, capital en inventario, gráfica comparativa Ventas vs. Ganancia real, tabla de rentabilidad por producto, alertas de inventario y exportación CSV), `/admin/orders` (vista dual **Kanban | Tabla**), `/admin/products` (gestión de stock, precio de compra, calculadora de margen en vivo y desactivación automática al agotarse), `/admin/categories`, `/admin/coupons` y `/admin/users`.

- ✅ **Fase 5 (Tiempo Real + Notificaciones de Navegador / SW)**:
  - `useSocket.ts` (Socket.io con JWT en `auth.token`, reconexión al rotar token), `utils/sound.ts` (Web Audio API), `utils/browserNotifications.ts` (notificación de navegador con íconos PNG `icon-192.png`, registro de `/sw.js` en contextos seguros `localhost`/`HTTPS`, fallback a `new Notification`, `tag` único en pruebas y tarjeta con sincronización de permisos y guía de desbloqueo en `ProfilePage`), `public/sw.js` (`deliverypro-shell-v2`, `notificationclick`), plantilla `public/firebase-messaging-sw.js` y `LiveTrackingMap` en `/orders/:id` para órdenes `OUT_FOR_DELIVERY`.
  - Pendiente para Push FCM remoto: credenciales Firebase en backend/frontend y habilitar `fcmTokens` en DTOs de usuarios del backend.

- ✅ **Fase 4 (Checkout, Pasarela MercadoPago, Mis Pedidos y Reseñas Verificadas)**:
  - Servicio `orders.api.ts` conectado a `POST /orders`, `GET /orders/me`, `GET /orders/:id`, `PATCH /orders/:id/cancel`, `POST /orders/:id/pay`, `GET /orders` y `PATCH /orders/:id/status`.
  - `CheckoutPage` (`/checkout`) en 3 pasos con selección de dirección, resumen del carrito activo, cupón promocional y redirección a MercadoPago Checkout Pro.
  - `PaymentResultPage` (`/payments/:status`) para las redirecciones `success`, `pending` y `failure` de MercadoPago.
  - `MyOrdersPage` (`/orders`) con filtros por estado (`OrderStatus`), rango de fechas (`dateFrom`, `dateTo`) y paginación.
  - `OrderDetailPage` (`/orders/:id`) con stepper de progreso, cancelación por cliente en estado `PENDING`, consola rápida de transición de estados (modo Admin) y `ReviewFormModal` (`POST /reviews`) para calificar productos en órdenes `DELIVERED`.

- ✅ **Fase 8 (Calidad, Testing, PWA, Code Splitting y Dockerización)**:
  - **ESLint 9 (`eslint.config.js`)** + scripts `lint`, `typecheck`, `test`, `test:watch` y `test:e2e`.
  - **Tests Unitarios y de Componentes (Vitest + Testing Library + jsdom)**: 27 archivos / 85 tests (`jwt.test.ts`, `formatters.test.ts`, `inventory.test.ts`, `browserNotifications.test.ts`, `useAuthStore.test.ts`, `useCartMutations.test.tsx`, `useSocket.test.tsx`, `CartDrawer.test.tsx`, `CouponInputBox.test.tsx`, `SocialAuthButtons.test.tsx`, `AdminLayout.test.tsx`, `ClientLayout.test.tsx`, `DeliveryLayout.test.tsx`, `UserAvatar.test.tsx`, `ProductCard.test.tsx`, `LoginPage.test.tsx`, `RegisterPage.test.tsx`, `VerifyEmailPage.test.tsx`, `PasswordRecovery.test.tsx`, `ProfilePage.test.tsx`, `CheckoutPage.test.tsx`, `PaymentResultPage.test.tsx`, `RiderPages.test.tsx`, `AdminDashboardPage.test.tsx`, `AdminOrdersPage.test.tsx`, `AdminProductsPage.test.tsx` y `AdminUsersPage.test.tsx`).
  - **Tests E2E Multirrol (`e2e/delivery-flow.spec.ts` con Playwright)**: flujo completo Cliente -> Admin -> Repartidor -> Cliente reseña.
  - **Performance & PWA**: `React.lazy` + `Suspense` en `AppRouter.tsx`, `manualChunks` en `vite.config.ts`, `public/manifest.webmanifest`, íconos PNG y SVG (`192`/`512`) y Service Workers (`public/sw.js` + `public/firebase-messaging-sw.js`).
  - **Docker Producción (Non-Root)**: `Dockerfile` multi-stage con `nginxinc/nginx-unprivileged:1.27-alpine` en puerto `8080`, `nginx.conf` (Gzip, caché `/assets/`, no-cache para SWs, `/healthz`, SPA fallback) y `.dockerignore`.

- 🚧 **Fase 9 (Pulido Rápido Responsive Crítico Web — Puente hacia App Nativa)** — planificada ([roadmap frontend](../docs/roadmap%20frontend%20delivery.md) · [roadmap mobile](../docs/roadmap%20mobile%20delivery.md)):
  - **9.0 Auditoría rápida de desbordes:** verificación anti-overflow en `360px` / `390px` sobre tablas/gráficas Admin (`AdminDashboardPage`, `AdminUsersPage`, `AdminOrdersPage`, `AdminProductsPage`, `AdminCouponsPage`), `ProfilePage`, `CartDrawer` e `index.html`.
  - **9.1 Correcciones críticas Web:** `viewport-fit=cover`, tablas Admin con `overflow-x-auto`/tarjetas, gráficas fluidas sin anchos fijos, `CartDrawer` (`w-full sm:max-w-md`) y acordeones/tabs básicos en `ProfilePage`. *(Nota: `useSocket` en `DeliveryLayout.tsx` ya quedó completado en `FE · Repartidores`).*
  - *Nota de arquitectura:* el **Panel Admin permanece 100% en esta Web**, mientras que la experiencia comercial de **Cliente + Repartidor** para **Google Play Store** pasa al nuevo proyecto nativo **`delivery-mobile/` (React Native + Expo)** en [docs/roadmap mobile delivery.md](../docs/roadmap%20mobile%20delivery.md).
