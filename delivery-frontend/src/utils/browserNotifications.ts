export type BrowserNotificationPermission =
  | NotificationPermission
  | 'unsupported';

const NOTIFICATION_ICON_URL = '/icons/icon-192.png';

export function isBrowserNotificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): BrowserNotificationPermission {
  if (!isBrowserNotificationsSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

export function isFirebaseWebConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID &&
      import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID &&
      import.meta.env.VITE_FIREBASE_APP_ID &&
      import.meta.env.VITE_FIREBASE_VAPID_KEY,
  );
}

export async function registerNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !window.isSecureContext
  ) {
    return null;
  }

  try {
    const existing = await navigator.serviceWorker.getRegistration('/sw.js');
    if (existing) {
      return existing;
    }
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (!isBrowserNotificationsSupported()) {
    return 'unsupported';
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function showOrderStatusNotification(
  title: string,
  body: string,
  orderId?: string,
): Promise<boolean> {
  if (getNotificationPermission() !== 'granted') {
    return false;
  }

  const targetUrl = orderId ? `/orders/${orderId}` : '/profile';
  const tag = orderId
    ? `delivery-order-${orderId}`
    : `delivery-order-test-${Date.now()}`;

  // 1. Intentar primero mediante el Service Worker activo (permite click incluso en segundo plano)
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg =
        (await navigator.serviceWorker.getRegistration('/sw.js')) ??
        (await navigator.serviceWorker.getRegistration());

      if (reg && reg.active && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, {
          body,
          icon: NOTIFICATION_ICON_URL,
          badge: NOTIFICATION_ICON_URL,
          tag,
          data: { url: targetUrl },
        });
        return true;
      }
    } catch {
      // Si el Service Worker falla o aún no está activo, continuamos al fallback nativo
    }
  }

  // 2. Fallback directo con la Web Notifications API del navegador
  try {
    const notification = new Notification(title, {
      body,
      icon: NOTIFICATION_ICON_URL,
      tag,
    });

    notification.onclick = () => {
      window.focus();
      if (window.location.pathname !== targetUrl) {
        window.location.assign(targetUrl);
      }
      notification.close();
    };

    return true;
  } catch {
    return false;
  }
}
