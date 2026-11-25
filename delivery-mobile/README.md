# 📱 DeliveryPro Mobile (`delivery-mobile/`)

Aplicación móvil nativa unificada (**Cliente `CLIENT` + Repartidor `DELIVERY`**) de la plataforma **DeliveryPro**, construida con **React Native (`0.88`)**, **Expo (`SDK 58`)**, **Expo Router**, **TypeScript**, **TanStack Query v5**, **Zustand** y **`expo-secure-store`** bajo el sistema de diseño `ui-ux-pro-max`.

> El Panel Administrativo (`ADMIN`) permanece exclusivamente en la aplicación Web (`delivery-frontend/`).

---

## 🛠️ Stack Principal

- **Core & Enrutamiento:** React Native `0.88.1`, React `19.3`, Expo `~58.0`, Expo Router (grupos `(auth)`, `(client)` y `(delivery)`).
- **Estilos & Diseño (`ui-ux-pro-max`):** `StyleSheet` nativo de alto rendimiento, `expo-linear-gradient`, tipografías `@expo-google-fonts/outfit` + `@expo-google-fonts/plus-jakarta-sans`, `lucide-react-native` (0 emojis UI) y soporte Light / Dark Mode.
- **Seguridad & Estado:** `expo-secure-store` (JWT cifrados en Keystore/Keychain), Axios con cola de *Silent Refresh* (`src/api/axios.client.ts`), TanStack Query v5 y Zustand (`AsyncStorage`).
- **Tiempo Real & Sensores:** `socket.io-client` con reconexión por `AppState`, `expo-location` (GPS + geocodificación inversa), `expo-image-picker` (Avatar S3), `expo-web-browser` (MercadoPago Checkout Pro) y `expo-haptics`.
- **Compatibilidad Node 20:** `scripts/node-compat.cjs` + `scripts/run-expo.cjs` habilitan ejecución fluida sobre Node.js `v20.11+` y fijan Metro en el puerto `8082` para evitar colisión con `mongo-express` (`8081`).

---

## 🚀 Inicio Rápido en Desarrollo (Expo Go)

1. Copia `.env.example` a `.env` y coloca la IP LAN Wi-Fi de tu PC:
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.7:3000/api/v1
   EXPO_PUBLIC_WS_URL=http://192.168.1.7:3000
   ```
2. Asegúrate de tener encendido el backend (`docker compose up -d` en la raíz).
3. Instala dependencias e inicia Metro en el puerto `8082`:
   ```bash
   cd delivery-mobile
   npm install
   npm start -- --clear
   ```
4. Escanea el código QR (`exp://<TU_IP_LAN>:8082`) con **Expo Go** en Android (misma red Wi-Fi).

---

## 🧪 Verificación de Calidad

```bash
# Verificación estricta de TypeScript
npm run typecheck

# Suite de pruebas unitarias (Jest)
npm test
```
