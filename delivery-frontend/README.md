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
