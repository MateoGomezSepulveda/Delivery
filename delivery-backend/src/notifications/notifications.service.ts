import { Injectable, Logger } from '@nestjs/common';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor() {
    // Si tienes un archivo serviceAccountKey.json, se pasa aquí.
    // Por ahora inicializaremos la app de manera segura para que no falle si no hay credenciales.
    try {
      if (!getApps().length) {
        initializeApp({
          // credential: cert(serviceAccount)
        });
      }
    } catch (error) {
      this.logger.warn('Firebase Admin no pudo inicializarse. Posiblemente falten credenciales.');
    }
  }

  async sendOrderStatusPush(tokens: string[], orderId: string, status: string) {
    if (!tokens || tokens.length === 0) return;

    try {
      const message = {
        notification: {
          title: '¡Actualización de tu pedido! 🛵',
          body: `Tu pedido #${orderId.substring(0, 8)} ahora está en estado ${status}.`,
        },
        tokens,
      };
      const response = await getMessaging().sendEachForMulticast(message);
      this.logger.log(`Notificación Push enviada: ${response.successCount} exitosas, ${response.failureCount} fallidas`);
    } catch (error) {
      this.logger.error('Error enviando notificación Push', error);
    }
  }
}
