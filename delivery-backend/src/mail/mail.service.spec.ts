import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
  createTestAccount: jest.fn(),
  getTestMessageUrl: jest.fn(),
}));

describe('MailService', () => {
  let service: MailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'NODE_ENV' ? 'test' : undefined,
            ),
          },
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('usa fallback de consola en entorno test sin llamar red externa', async () => {
    const result = await service.sendEmailVerification(
      'cliente@correo.com',
      'Mateo',
      '482913',
      'http://localhost:5173/verify-email?token=abc',
    );

    expect(result).toEqual({ sent: false, provider: 'console' });
  });

  it('usa fallback de consola al enviar correo de recuperación en entorno test', async () => {
    const result = await service.sendPasswordResetEmail(
      'cliente@correo.com',
      'Mateo',
      'http://localhost:5173/reset-password?token=xyz',
    );

    expect(result).toEqual({ sent: false, provider: 'console' });
  });

  it('configura timeouts cortos en transporter SMTP para evitar cuelgues de red', async () => {
    const createTransportMock = nodemailer.createTransport as jest.Mock;
    createTransportMock.mockReset().mockReturnValue({
      sendMail: jest.fn(),
    } as unknown as nodemailer.Transporter);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                NODE_ENV: 'development',
                SMTP_HOST: 'smtp.gmail.com',
                SMTP_PORT: '587',
                SMTP_USER: 'demo@gmail.com',
                SMTP_PASS: 'abcd efgh ijkl mnop',
              };
              return map[key];
            }),
          },
        },
      ],
    }).compile();

    module.get<MailService>(MailService);
    await Promise.resolve();

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.gmail.com',
        port: 587,
        connectionTimeout: 4000,
        greetingTimeout: 4000,
        socketTimeout: 6000,
        dnsTimeout: 3000,
      }),
    );
  });
});
