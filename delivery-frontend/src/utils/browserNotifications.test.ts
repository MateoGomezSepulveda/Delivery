import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getNotificationPermission,
  registerNotificationServiceWorker,
  showOrderStatusNotification,
} from '@/utils/browserNotifications';

describe('browserNotifications (Bug #6)', () => {
  const originalNotification = window.Notification;
  const originalServiceWorker = navigator.serviceWorker;
  const originalIsSecureContext = window.isSecureContext;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: originalNotification,
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: originalServiceWorker,
    });
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      writable: true,
      value: originalIsSecureContext,
    });
  });

  it('returns false when notification permission is not granted', async () => {
    const MockNotification = vi.fn();
    Object.defineProperty(MockNotification, 'permission', {
      configurable: true,
      value: 'denied',
    });
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: MockNotification,
    });

    expect(getNotificationPermission()).toBe('denied');
    const result = await showOrderStatusNotification('Test', 'Body');
    expect(result).toBe(false);
    expect(MockNotification).not.toHaveBeenCalled();
  });

  it('uses active Service Worker with PNG icon and unique test tag when no orderId is passed', async () => {
    const showNotificationMock = vi.fn().mockResolvedValue(undefined);
    const getRegistrationMock = vi.fn().mockResolvedValue({
      active: {},
      showNotification: showNotificationMock,
    });

    const MockNotification = vi.fn();
    Object.defineProperty(MockNotification, 'permission', {
      configurable: true,
      value: 'granted',
    });
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: MockNotification,
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: { getRegistration: getRegistrationMock },
    });

    const ok = await showOrderStatusNotification(
      'DeliveryPro — Prueba',
      'Todo funciona bien',
    );

    expect(ok).toBe(true);
    expect(showNotificationMock).toHaveBeenCalledWith(
      'DeliveryPro — Prueba',
      expect.objectContaining({
        body: 'Todo funciona bien',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: expect.stringMatching(/^delivery-order-test-\d+$/),
        data: { url: '/profile' },
      }),
    );
    expect(MockNotification).not.toHaveBeenCalled();
  });

  it('falls back to window.Notification with PNG icon when Service Worker showNotification throws', async () => {
    const showNotificationMock = vi
      .fn()
      .mockRejectedValue(new Error('SW inactive'));
    const getRegistrationMock = vi.fn().mockResolvedValue({
      active: {},
      showNotification: showNotificationMock,
    });

    const instances: Array<{ title: string; options?: NotificationOptions }> =
      [];
    class MockNotification {
      static permission: NotificationPermission = 'granted';
      onclick: (() => void) | null = null;
      close = vi.fn();

      constructor(title: string, options?: NotificationOptions) {
        instances.push({ title, options });
      }
    }

    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: MockNotification,
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: { getRegistration: getRegistrationMock },
    });

    const ok = await showOrderStatusNotification(
      'Pedido #123456',
      'En camino',
      'order-123456',
    );

    expect(ok).toBe(true);
    expect(showNotificationMock).toHaveBeenCalledTimes(1);
    expect(instances).toHaveLength(1);
    expect(instances[0]).toEqual({
      title: 'Pedido #123456',
      options: expect.objectContaining({
        body: 'En camino',
        icon: '/icons/icon-192.png',
        tag: 'delivery-order-order-123456',
      }),
    });
  });

  it('registers /sw.js in secure context (localhost or HTTPS) when not yet registered', async () => {
    const mockReg = { active: {} } as ServiceWorkerRegistration;
    const getRegistrationMock = vi.fn().mockResolvedValue(undefined);
    const registerMock = vi.fn().mockResolvedValue(mockReg);

    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      writable: true,
      value: true,
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: {
        getRegistration: getRegistrationMock,
        register: registerMock,
      },
    });

    const reg = await registerNotificationServiceWorker();
    expect(reg).toBe(mockReg);
    expect(registerMock).toHaveBeenCalledWith('/sw.js');
  });
});
