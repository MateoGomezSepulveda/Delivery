import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const TWILIO_REQUEST_TIMEOUT_MS = 8000;

export interface SendSmsResult {
  sent: boolean;
  provider: 'twilio-verify' | 'twilio' | 'console';
  sid?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(@Optional() private readonly configService?: ConfigService) {}

  private getConfigValue(key: string): string {
    return (
      this.configService?.get<string>(key) ||
      process.env[key] ||
      ''
    ).trim();
  }

  hasVerifyService(): boolean {
    return Boolean(
      this.getConfigValue('TWILIO_ACCOUNT_SID') &&
      this.getConfigValue('TWILIO_AUTH_TOKEN') &&
      this.getConfigValue('TWILIO_VERIFY_SERVICE_SID'),
    );
  }

  hasProgrammableSms(): boolean {
    return Boolean(
      this.getConfigValue('TWILIO_ACCOUNT_SID') &&
      this.getConfigValue('TWILIO_AUTH_TOKEN') &&
      this.getConfigValue('TWILIO_FROM_NUMBER'),
    );
  }

  isConfigured(): boolean {
    return this.hasVerifyService() || this.hasProgrammableSms();
  }

  async sendVerificationSms(to: string, code: string): Promise<SendSmsResult> {
    const nodeEnv =
      this.configService?.get<string>('NODE_ENV') ?? process.env.NODE_ENV;

    if (nodeEnv === 'test' || !this.isConfigured()) {
      this.logger.log(
        `[SMS VERIFICACIÓN] Destinatario: ${to} | Código: ${code}`,
      );
      return { sent: false, provider: 'console' };
    }

    const accountSid = this.getConfigValue('TWILIO_ACCOUNT_SID');
    const authToken = this.getConfigValue('TWILIO_AUTH_TOKEN');
    const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString(
      'base64',
    );

    // Prioridad 1: Twilio Verify API (compatible con cuentas Trial gratuitas y producción)
    if (this.hasVerifyService()) {
      const verifyServiceSid = this.getConfigValue('TWILIO_VERIFY_SERVICE_SID');
      const endpoint = `https://verify.twilio.com/v2/Services/${encodeURIComponent(verifyServiceSid)}/Verifications`;
      const body = new URLSearchParams({
        To: to,
        Channel: 'sms',
      });

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
          signal: AbortSignal.timeout(TWILIO_REQUEST_TIMEOUT_MS),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          this.logger.error(
            `Error enviando SMS por Twilio Verify (${response.status}): ${errorText}`,
          );
          this.logger.log(
            `[FALLBACK SMS VERIFICACIÓN] Destinatario: ${to} | Código: ${code}`,
          );
          return { sent: false, provider: 'console' };
        }

        const data = (await response.json()) as {
          sid?: string;
          status?: string;
        };
        this.logger.log(
          `SMS OTP enviado vía Twilio Verify a ${to} (SID: ${data.sid})`,
        );
        return {
          sent: true,
          provider: 'twilio-verify',
          sid: data.sid,
        };
      } catch (error) {
        this.logger.error(
          `Error de red enviando SMS vía Twilio Verify a ${to}`,
          error,
        );
        this.logger.log(
          `[FALLBACK SMS VERIFICACIÓN] Destinatario: ${to} | Código: ${code}`,
        );
        return { sent: false, provider: 'console' };
      }
    }

    // Prioridad 2: Twilio Programmable SMS (requiere cuenta Twilio paga para cuerpo libre)
    const fromNumber = this.getConfigValue('TWILIO_FROM_NUMBER');
    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
    const body = new URLSearchParams({
      To: to,
      From: fromNumber,
      Body: `DeliveryPro: tu código de verificación es ${code}. Vence en 15 minutos.`,
    });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
        signal: AbortSignal.timeout(TWILIO_REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        this.logger.error(
          `Error enviando SMS por Twilio (${response.status}): ${errorText}`,
        );
        this.logger.log(
          `[FALLBACK SMS VERIFICACIÓN] Destinatario: ${to} | Código: ${code}`,
        );
        return { sent: false, provider: 'console' };
      }

      const data = (await response.json()) as { sid?: string };
      this.logger.log(`SMS de verificación enviado a ${to} (SID: ${data.sid})`);
      return {
        sent: true,
        provider: 'twilio',
        sid: data.sid,
      };
    } catch (error) {
      this.logger.error(`Error de red enviando SMS a ${to}`, error);
      this.logger.log(
        `[FALLBACK SMS VERIFICACIÓN] Destinatario: ${to} | Código: ${code}`,
      );
      return { sent: false, provider: 'console' };
    }
  }

  async checkVerificationCode(to: string, code: string): Promise<boolean> {
    const nodeEnv =
      this.configService?.get<string>('NODE_ENV') ?? process.env.NODE_ENV;

    if (nodeEnv === 'test' || !this.hasVerifyService()) {
      return false;
    }

    const accountSid = this.getConfigValue('TWILIO_ACCOUNT_SID');
    const authToken = this.getConfigValue('TWILIO_AUTH_TOKEN');
    const verifyServiceSid = this.getConfigValue('TWILIO_VERIFY_SERVICE_SID');
    const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString(
      'base64',
    );
    const endpoint = `https://verify.twilio.com/v2/Services/${encodeURIComponent(verifyServiceSid)}/VerificationCheck`;
    const body = new URLSearchParams({
      To: to,
      Code: code.trim(),
    });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
        signal: AbortSignal.timeout(TWILIO_REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        this.logger.warn(
          `Twilio Verify VerificationCheck falló (${response.status}): ${errorText}`,
        );
        return false;
      }

      const data = (await response.json()) as {
        status?: string;
        valid?: boolean;
      };
      return data.status === 'approved' || data.valid === true;
    } catch (error) {
      this.logger.error(
        `Error validando código OTP vía Twilio Verify para ${to}`,
        error,
      );
      return false;
    }
  }
}
