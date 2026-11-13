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

# 3. Verificar tipos TypeScript
npm run typecheck

# 4. Generar build de producción
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
