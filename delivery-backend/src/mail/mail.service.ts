import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.initEthereal();
  }

  private async initEthereal() {
    try {
      // Crea cuenta temporal si no hay credenciales
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      this.logger.log('Cuenta de Ethereal lista para enviar correos.');
    } catch (error) {
      this.logger.error('Error inicializando Ethereal', error);
    }
  }

  async sendOrderStatusEmail(to: string, orderId: string, status: string) {
    if (!this.transporter) {
      this.logger.warn('El transporter de correos aún no está listo.');
      return;
    }
    try {
      const info = await this.transporter.sendMail({
        from: '"Delivery App" <noreply@delivery.com>',
        to,
        subject: `Actualización de tu pedido #${orderId.substring(0, 8)}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #4CAF50;">¡Hola! Tu pedido ha cambiado de estado 🛵</h2>
            <p>Queremos avisarte que tu pedido con ID <strong>${orderId}</strong> ahora se encuentra en estado: <span style="background: #eee; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${status}</span>.</p>
            <p>Gracias por preferirnos.</p>
          </div>
        `,
      });
      this.logger.log(`Correo enviado: ${nodemailer.getTestMessageUrl(info)}`);
    } catch (error) {
      this.logger.error(`Error enviando correo a ${to}`, error);
    }
  }
}
