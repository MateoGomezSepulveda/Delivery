import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Query,
  Res,
  Logger,
  HttpCode,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Recibir notificaciones de MercadoPago' })
  async webhook(@Body() body: any, @Query() query: any, @Req() req: any) {
    this.logger.log(
      `Webhook recibido de MercadoPago: ${JSON.stringify(query)}`,
    );

    try {
      // MercadoPago sends 'data.id' or 'id' in the query depending on the topic
      const paymentId = query['data.id'] || query.id;
      const type = query.type || query.topic;

      if (type === 'payment' && paymentId) {
        // En lugar de actualizar directamente desde el payload (inseguro),
        // consultamos a la API de MP para verificar el estado real del pago.
        // NOTA: Para no depender circularmente de OrdersService aquí, podemos
        // emitir un evento o la actualización se hará en el webhook.
        // Como este es el controlador, delegamos a un servicio que actualice.
        const result = await this.paymentsService.verifyPayment(paymentId);

        // TODO: Update Order status in Database using `result.orderId` and `result.status`
        // Esto se hará conectando OrdersService o mediante EventEmitter.
        this.logger.log(
          `Pago verificado: Order ${result.orderId}, Status: ${result.status}`,
        );
      }

      // MercadoPago requires a 200 OK fast response
      return 'OK';
    } catch (error) {
      this.logger.error('Error procesando webhook', error);
      return 'OK'; // MP sigue requiriendo 200 o reintenta infinitamente
    }
  }

  @Public()
  @Get('success')
  @ApiOperation({ summary: 'Redirección de pago exitoso' })
  paymentSuccess(@Res() res: any) {
    // Redirigir al frontend
    res.send('<h1>¡Pago Exitoso! Tu pedido está en camino.</h1>');
  }

  @Public()
  @Get('failure')
  @ApiOperation({ summary: 'Redirección de pago fallido' })
  paymentFailure(@Res() res: any) {
    res.send('<h1>Hubo un error con el pago. Intenta de nuevo.</h1>');
  }

  @Public()
  @Get('pending')
  @ApiOperation({ summary: 'Redirección de pago pendiente' })
  paymentPending(@Res() res: any) {
    res.send('<h1>Tu pago está siendo procesado...</h1>');
  }
}
