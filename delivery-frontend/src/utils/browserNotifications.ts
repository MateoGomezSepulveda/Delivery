export type BrowserNotificationPermission =
  | NotificationPermission
  | 'unsupported';

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

  const targetUrl = orderId ? `/orders/${orderId}` : '/orders';
  const tag = orderId ? `delivery-order-${orderId}` : 'delivery-order-status';

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, {
          body,
          icon: '/icons/icon-192.svg',
          badge: '/icons/icon-192.svg',
          tag,
          data: { url: targetUrl },
        });
        return true;
      }
    }

    new Notification(title, {
      body,
      icon: '/icons/icon-192.svg',
      tag,
    });
    return true;
  } catch {
    return false;
  }
}
