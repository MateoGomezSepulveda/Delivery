import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  Logger,
  HttpCode,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  private buildFrontendRedirectUrl(
    outcome: 'success' | 'failure' | 'pending',
    query: Record<string, any>,
  ): string {
    const frontendUrl = (
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173'
    ).replace(/\/+$/, '');

    const params = new URLSearchParams();
    const externalRef = query.external_reference || query.orderId;
    const paymentId = query.payment_id || query.collection_id;
    const status = query.status || query.collection_status;

    if (externalRef) params.set('external_reference', String(externalRef));
    if (paymentId) params.set('payment_id', String(paymentId));
    if (status) params.set('status', String(status));

    const qs = params.toString();
    return `${frontendUrl}/payments/${outcome}${qs ? `?${qs}` : ''}`;
  }

  private async trySyncReturnedPayment(query: Record<string, any>) {
    const paymentId = query.payment_id || query.collection_id;
    const externalRef = query.external_reference || query.orderId;
    if (!paymentId || String(paymentId) === 'null') return;

    try {
      await this.paymentsService.verifyPayment(
        String(paymentId),
        externalRef ? String(externalRef) : undefined,
      );
    } catch (error) {
      this.logger.warn(
        `No se pudo sincronizar el pago ${paymentId} en la redirección: ${(error as Error).message}`,
      );
    }
  }

  @Public()
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Recibir notificaciones Webhook de MercadoPago' })
  async webhook(@Body() body: any, @Query() query: any) {
    this.logger.log(
      `Webhook recibido de MercadoPago: query=${JSON.stringify(query)} body=${JSON.stringify(body)}`,
    );

    try {
      // Soporta Webhooks v2 (body.data.id / body.type) e IPN v1 (query['data.id'] / query.topic)
      const paymentId =
        body?.data?.id || query?.['data.id'] || query?.id || body?.id;
      const type = body?.type || query?.type || query?.topic || body?.topic;

      if (type === 'payment' && paymentId) {
        const result = await this.paymentsService.verifyPayment(
          String(paymentId),
        );
        this.logger.log(
          `Pago verificado vía webhook: Order ${result.orderId}, Status: ${result.status}, MP: ${result.mpStatus}`,
        );
      }

      // MercadoPago exige responder 200 OK rápidamente para no reintentar indefinidamente
      return { received: true };
    } catch (error) {
      this.logger.error('Error procesando webhook de MercadoPago', error);
      return { received: true };
    }
  }

  @Public()
  @Get('success')
  @ApiOperation({ summary: 'Redirección de pago exitoso hacia el Frontend' })
  async paymentSuccess(@Query() query: Record<string, any>, @Res() res: any) {
    await this.trySyncReturnedPayment(query);
    return res.redirect(302, this.buildFrontendRedirectUrl('success', query));
  }

  @Public()
  @Get('failure')
  @ApiOperation({ summary: 'Redirección de pago fallido hacia el Frontend' })
  async paymentFailure(@Query() query: Record<string, any>, @Res() res: any) {
    await this.trySyncReturnedPayment(query);
    return res.redirect(302, this.buildFrontendRedirectUrl('failure', query));
  }

  @Public()
  @Get('pending')
  @ApiOperation({ summary: 'Redirección de pago pendiente hacia el Frontend' })
  async paymentPending(@Query() query: Record<string, any>, @Res() res: any) {
    await this.trySyncReturnedPayment(query);
    return res.redirect(302, this.buildFrontendRedirectUrl('pending', query));
  }
}
