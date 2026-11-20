import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

export const RIDERS_AVAILABLE_ROOM = 'riders_available';

@WebSocketGateway({
  cors: {
    origin: '*', // En producción debes cambiarlo a tu dominio del frontend
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('EventsGateway');

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      this.logger.log(
        `Handshake query: ${JSON.stringify(client.handshake.query)}`,
      );
      this.logger.log(
        `Handshake headers: ${JSON.stringify(client.handshake.headers)}`,
      );
      this.logger.log(
        `Handshake auth: ${JSON.stringify(client.handshake.auth)}`,
      );

      // Navegador: el token llega en handshake.auth (los navegadores no pueden
      // enviar headers personalizados por WebSocket). Se mantiene `headers.token`
      // para clientes como Postman.
      const rawToken = (client.handshake.headers?.token ||
        client.handshake.auth?.token ||
        client.handshake.query?.token) as string | undefined;
      if (!rawToken) throw new Error('Token no proporcionado');

      const token = rawToken.startsWith('Bearer ')
        ? rawToken.split(' ')[1]
        : rawToken;

      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify(token, { secret });

      // El JWT usa `sub` como identificador de usuario
      const userId = String(payload.sub ?? payload.userId);
      client.join(userId);

      // Los repartidores autenticados se unen automáticamente a la sala de alertas en vivo
      if (payload.role === 'DELIVERY') {
        client.join(RIDERS_AVAILABLE_ROOM);
        this.logger.log(
          `Repartidor ${userId} unido a la sala ${RIDERS_AVAILABLE_ROOM}`,
        );
      }

      this.logger.log(`Cliente conectado exitosamente: ${userId}`);
    } catch (error) {
      this.logger.warn(`Conexión rechazada: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  // Método que usaremos desde otros servicios para emitir eventos
  emitOrderStatusUpdate(userId: string, orderData: any) {
    this.server?.to(userId).emit('order_status_updated', orderData);
  }

  emitDeliveryLocationUpdate(userId: string, locationData: any) {
    this.server?.to(userId).emit('delivery_location_updated', locationData);
  }

  emitNewAvailableOrder(orderData: any) {
    this.server
      ?.to(RIDERS_AVAILABLE_ROOM)
      .emit('new_available_order', orderData);
  }

  emitOrderTaken(orderId: string, takenBy?: string) {
    this.server
      ?.to(RIDERS_AVAILABLE_ROOM)
      .emit('order_taken', { orderId, takenBy });
  }
}
