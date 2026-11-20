import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as dns from 'dns';
import * as nodemailer from 'nodemailer';

const SMTP_CONNECTION_TIMEOUT_MS = 4000;
const SMTP_GREETING_TIMEOUT_MS = 4000;
const SMTP_SOCKET_TIMEOUT_MS = 6000;
const SMTP_DNS_TIMEOUT_MS = 3000;
const SEND_MAIL_OVERALL_TIMEOUT_MS = 10000;

export interface SendMailResult {
  sent: boolean;
  previewUrl?: string;
  provider: 'smtp' | 'ethereal' | 'console';
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private initPromise: Promise<void> | null = null;
  private provider: 'smtp' | 'ethereal' | 'console' = 'console';

  constructor(@Optional() private readonly configService?: ConfigService) {
    const nodeEnv =
      this.configService?.get<string>('NODE_ENV') ?? process.env.NODE_ENV;
    if (nodeEnv !== 'test') {
      this.initPromise = this.initTransporter();
    }
  }

  private getFromAddress(): string {
    return (
      this.configService?.get<string>('MAIL_FROM') ||
      process.env.MAIL_FROM ||
      '"DeliveryPro" <noreply@deliverypro.com>'
    );
  }

  private async initTransporter(): Promise<void> {
    const smtpHost = (
      this.configService?.get<string>('SMTP_HOST') ||
      process.env.SMTP_HOST ||
      ''
    ).trim();
    const smtpUser = (
      this.configService?.get<string>('SMTP_USER') ||
      process.env.SMTP_USER ||
      ''
    ).trim();
    const rawSmtpPass = (
      this.configService?.get<string>('SMTP_PASS') ||
      process.env.SMTP_PASS ||
      ''
    ).trim();
    const smtpPass = smtpHost.toLowerCase().includes('gmail')
      ? rawSmtpPass.replace(/\s+/g, '')
      : rawSmtpPass;

    if (smtpHost && smtpUser && smtpPass) {
      try {
        dns.setDefaultResultOrder('ipv4first');
      } catch {
        // Ignore if runtime does not support changing DNS result order
      }

      const smtpPort = Number(
        this.configService?.get<string>('SMTP_PORT') ||
          process.env.SMTP_PORT ||
          587,
      );
      const smtpSecureRaw =
        this.configService?.get<string>('SMTP_SECURE') ||
        process.env.SMTP_SECURE;
      const secure =
        smtpSecureRaw !== undefined
          ? smtpSecureRaw === 'true'
          : smtpPort === 465;

      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure,
        connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
        greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
        socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
        dnsTimeout: SMTP_DNS_TIMEOUT_MS,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      this.provider = 'smtp';
      this.logger.log(
        `Transporter SMTP configurado (${smtpHost}:${smtpPort}).`,
      );
      return;
    }

    try {
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
        greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
        socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
        dnsTimeout: SMTP_DNS_TIMEOUT_MS,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      this.provider = 'ethereal';
      this.logger.log('Cuenta de Ethereal lista para enviar correos.');
    } catch (error) {
      this.provider = 'console';
      this.logger.warn(
        'No se pudo inicializar Ethereal; los correos se registrarán en consola.',
      );
      this.logger.debug(error);
    }
  }

  private async ensureTransporter(): Promise<nodemailer.Transporter | null> {
    const nodeEnv =
      this.configService?.get<string>('NODE_ENV') ?? process.env.NODE_ENV;
    if (nodeEnv === 'test') {
      return null;
    }

    if (!this.transporter) {
      if (!this.initPromise) {
        this.initPromise = this.initTransporter();
      }
      await this.initPromise;
      if (!this.transporter) {
        this.initPromise = null;
      }
    }

    return this.transporter;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private async sendMailWithTimeout(
    transporter: nodemailer.Transporter,
    options: nodemailer.SendMailOptions,
    timeoutMs = SEND_MAIL_OVERALL_TIMEOUT_MS,
  ): Promise<nodemailer.SentMessageInfo> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sendPromise = transporter.sendMail(options);

    try {
      return await Promise.race([
        sendPromise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            reject(
              new Error(
                `SMTP sendMail excedió el tiempo límite de ${timeoutMs}ms`,
              ),
            );
          }, timeoutMs);
        }),
      ]);
    } catch (error) {
      // Evita UnhandledPromiseRejection si sendMail falla después del timeout
      sendPromise.catch(() => undefined);
      throw error;
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  async sendEmailVerification(
    to: string,
    name: string,
    code: string,
    verificationUrl: string,
  ): Promise<SendMailResult> {
    const transporter = await this.ensureTransporter();
    const safeName = this.escapeHtml(name);
    const safeCode = this.escapeHtml(code);
    const safeUrl = this.escapeHtml(verificationUrl);

    if (!transporter) {
      this.logger.log(
        `[VERIFICACIÓN DE CORREO] Destinatario: ${to} | Código: ${code} | Enlace: ${verificationUrl}`,
      );
      return { sent: false, provider: 'console' };
    }

    try {
      const info = await this.sendMailWithTimeout(transporter, {
        from: this.getFromAddress(),
        to,
        subject: `${code} es tu código de verificación — DeliveryPro`,
        text: `Hola ${name},\n\nGracias por registrarte en DeliveryPro. Tu código de verificación es: ${code}\n\nTambién puedes confirmar tu correo haciendo clic en este enlace (válido por 15 minutos):\n${verificationUrl}\n\nSi no creaste esta cuenta, puedes ignorar este mensaje.`,
        html: `
          <div style="background-color:#f8fafc;padding:32px 16px;font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;">
            <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;box-shadow:0 10px 25px rgba(15,23,42,0.06);">
              <div style="background:linear-gradient(135deg,#ea580c 0%,#dc2626 100%);padding:28px 32px;text-align:center;color:#ffffff;">
                <h1 style="margin:0;font-size:24px;font-weight:800;letter-spacing:-0.02em;">DeliveryPro</h1>
                <p style="margin:6px 0 0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.9;">Licorería, Cigarrillos &amp; Charcutería</p>
              </div>
              <div style="padding:32px;">
                <h2 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#0f172a;">Confirma tu correo electrónico</h2>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569;">
                  ¡Hola, <strong>${safeName}</strong>! Ya casi terminas de crear tu cuenta en <strong>DeliveryPro</strong>.
                  Ingresa el siguiente código de 6 dígitos en la aplicación o haz clic en el botón de verificación:
                </p>
                <div style="background:#fff7ed;border:1px dashed #fdba74;border-radius:16px;padding:20px;text-align:center;margin:24px 0;">
                  <span style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#c2410c;margin-bottom:8px;">
                    Tu código de verificación
                  </span>
                  <span style="font-family:Consolas,Monaco,'Courier New',monospace;font-size:34px;font-weight:800;letter-spacing:0.28em;color:#0f172a;">
                    ${safeCode}
                  </span>
                </div>
                <div style="text-align:center;margin:28px 0;">
                  <a href="${safeUrl}" style="display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 28px;border-radius:12px;">
                    Verificar mi correo ahora
                  </a>
                </div>
                <p style="margin:0 0 8px;font-size:12px;color:#64748b;line-height:1.5;">
                  Este código y enlace vencen en <strong>15 minutos</strong>. Si el botón no funciona, copia y pega este enlace en tu navegador:
                </p>
                <p style="margin:0;font-size:11px;word-break:break-all;color:#ea580c;">
                  <a href="${safeUrl}" style="color:#ea580c;">${safeUrl}</a>
                </p>
              </div>
              <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 32px;text-align:center;font-size:11px;color:#64748b;">
                Si no solicitaste crear una cuenta en DeliveryPro, puedes ignorar este correo de forma segura.
              </div>
            </div>
          </div>
        `,
      });

      const testUrl = nodemailer.getTestMessageUrl(info);
      const previewUrl = typeof testUrl === 'string' ? testUrl : undefined;
      if (previewUrl) {
        this.logger.log(
          `Correo de verificación enviado (Ethereal): ${previewUrl}`,
        );
      } else {
        this.logger.log(`Correo de verificación enviado a ${to}`);
      }

      return {
        sent: true,
        previewUrl,
        provider: this.provider,
      };
    } catch (error) {
      this.logger.error(`Error enviando correo de verificación a ${to}`, error);
      this.logger.log(
        `[FALLBACK VERIFICACIÓN] Destinatario: ${to} | Código: ${code} | Enlace: ${verificationUrl}`,
      );
      return { sent: false, provider: 'console' };
    }
  }

  async sendPasswordResetEmail(
    to: string,
    name: string,
    resetUrl: string,
  ): Promise<SendMailResult> {
    const transporter = await this.ensureTransporter();
    const safeName = this.escapeHtml(name || 'Cliente');
    const safeUrl = this.escapeHtml(resetUrl);

    if (!transporter) {
      this.logger.log(
        `[RECUPERACIÓN DE CONTRASEÑA] Destinatario: ${to} | Enlace: ${resetUrl}`,
      );
      return { sent: false, provider: 'console' };
    }

    try {
      const info = await this.sendMailWithTimeout(transporter, {
        from: this.getFromAddress(),
        to,
        subject: 'Restablece tu contraseña — DeliveryPro',
        text: `Hola ${name || 'Cliente'},\n\nRecibimos una solicitud para restablecer la contraseña de tu cuenta en DeliveryPro.\n\nAbre este enlace seguro (válido por 15 minutos) para definir tu nueva contraseña:\n${resetUrl}\n\nSi no realizaste esta solicitud, puedes ignorar este mensaje de forma segura.`,
        html: `
          <div style="background-color:#f8fafc;padding:32px 16px;font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;">
            <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;box-shadow:0 10px 25px rgba(15,23,42,0.06);">
              <div style="background:linear-gradient(135deg,#ea580c 0%,#dc2626 100%);padding:28px 32px;text-align:center;color:#ffffff;">
                <h1 style="margin:0;font-size:24px;font-weight:800;letter-spacing:-0.02em;">DeliveryPro</h1>
                <p style="margin:6px 0 0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.9;">Seguridad de tu Cuenta</p>
              </div>
              <div style="padding:32px;">
                <h2 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#0f172a;">Restablece tu contraseña</h2>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569;">
                  ¡Hola, <strong>${safeName}</strong>! Recibimos una solicitud para cambiar la contraseña de tu cuenta en <strong>DeliveryPro</strong>.
                  Haz clic en el siguiente botón para crear una nueva clave:
                </p>
                <div style="text-align:center;margin:28px 0;">
                  <a href="${safeUrl}" style="display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 28px;border-radius:12px;">
                    Restablecer mi contraseña
                  </a>
                </div>
                <p style="margin:0 0 8px;font-size:12px;color:#64748b;line-height:1.5;">
                  Este enlace es de un solo uso y vence en <strong>15 minutos</strong>. Si el botón no funciona, copia y pega este enlace en tu navegador:
                </p>
                <p style="margin:0;font-size:11px;word-break:break-all;color:#ea580c;">
                  <a href="${safeUrl}" style="color:#ea580c;">${safeUrl}</a>
                </p>
              </div>
              <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 32px;text-align:center;font-size:11px;color:#64748b;">
                Si no solicitaste restablecer tu contraseña, ignora este correo. Tu clave actual seguirá intacta.
              </div>
            </div>
          </div>
        `,
      });

      const testUrl = nodemailer.getTestMessageUrl(info);
      const previewUrl = typeof testUrl === 'string' ? testUrl : undefined;
      if (previewUrl) {
        this.logger.log(
          `Correo de recuperación enviado (Ethereal): ${previewUrl}`,
        );
      } else {
        this.logger.log(`Correo de recuperación enviado a ${to}`);
      }

      return {
        sent: true,
        previewUrl,
        provider: this.provider,
      };
    } catch (error) {
      this.logger.error(`Error enviando correo de recuperación a ${to}`, error);
      this.logger.log(
        `[FALLBACK RECUPERACIÓN] Destinatario: ${to} | Enlace: ${resetUrl}`,
      );
      return { sent: false, provider: 'console' };
    }
  }

  async sendOrderStatusEmail(to: string, orderId: string, status: string) {
    const transporter = await this.ensureTransporter();
    if (!transporter) {
      this.logger.warn('El transporter de correos aún no está listo.');
      return;
    }
    try {
      const info = await this.sendMailWithTimeout(transporter, {
        from: this.getFromAddress(),
        to,
        subject: `Actualización de tu pedido #${orderId.substring(0, 8)}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #4CAF50;">¡Hola! Tu pedido ha cambiado de estado</h2>
            <p>Queremos avisarte que tu pedido con ID <strong>${this.escapeHtml(orderId)}</strong> ahora se encuentra en estado: <span style="background: #eee; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${this.escapeHtml(status)}</span>.</p>
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
