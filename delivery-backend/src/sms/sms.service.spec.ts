import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmsService } from './sms.service';

describe('SmsService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('usa fallback de consola en entorno test sin llamar a Twilio', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
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

    const service = module.get<SmsService>(SmsService);
    const result = await service.sendVerificationSms('+573001234567', '482913');

    expect(result).toEqual({ sent: false, provider: 'console' });
  });

  it('envía SMS real vía Twilio REST API cuando las credenciales están configuradas', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sid: 'SM123456' }),
    } as Response);
    global.fetch = mockFetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                NODE_ENV: 'development',
                TWILIO_ACCOUNT_SID: 'AC123',
                TWILIO_AUTH_TOKEN: 'secret-token',
                TWILIO_FROM_NUMBER: '+15005550006',
              };
              return map[key];
            }),
          },
        },
      ],
    }).compile();

    const service = module.get<SmsService>(SmsService);
    expect(service.isConfigured()).toBe(true);

    const result = await service.sendVerificationSms('+573001234567', '482913');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json',
      expect.objectContaining({
        method: 'POST',
        signal: expect.any(AbortSignal),
      }),
    );
    expect(result).toEqual({
      sent: true,
      provider: 'twilio',
      sid: 'SM123456',
    });
  });

  it('hace fallback seguro a consola si Twilio responde con error HTTP', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'Invalid To number',
    } as Response);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                NODE_ENV: 'development',
                TWILIO_ACCOUNT_SID: 'AC123',
                TWILIO_AUTH_TOKEN: 'secret-token',
                TWILIO_FROM_NUMBER: '+15005550006',
              };
              return map[key];
            }),
          },
        },
      ],
    }).compile();

    const service = module.get<SmsService>(SmsService);
    const result = await service.sendVerificationSms('+573001234567', '482913');

    expect(result).toEqual({ sent: false, provider: 'console' });
  });

  it('hace fallback seguro a consola si Twilio falla por timeout o error de red', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new DOMException('The operation timed out', 'TimeoutError'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                NODE_ENV: 'development',
                TWILIO_ACCOUNT_SID: 'AC123',
                TWILIO_AUTH_TOKEN: 'secret-token',
                TWILIO_FROM_NUMBER: '+15005550006',
              };
              return map[key];
            }),
          },
        },
      ],
    }).compile();

    const service = module.get<SmsService>(SmsService);
    const result = await service.sendVerificationSms('+573001234567', '482913');

    expect(result).toEqual({ sent: false, provider: 'console' });
  });

  it('usa Twilio Verify API cuando TWILIO_VERIFY_SERVICE_SID está configurado y valida el OTP', async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'VE123456', status: 'pending' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'approved', valid: true }),
      } as Response);
    global.fetch = mockFetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                NODE_ENV: 'development',
                TWILIO_ACCOUNT_SID: 'AC123',
                TWILIO_AUTH_TOKEN: 'secret-token',
                TWILIO_VERIFY_SERVICE_SID: 'VA999888777',
              };
              return map[key];
            }),
          },
        },
      ],
    }).compile();

    const service = module.get<SmsService>(SmsService);
    expect(service.hasVerifyService()).toBe(true);
    expect(service.isConfigured()).toBe(true);

    const sendRes = await service.sendVerificationSms('+573001234567', '482913');
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      'https://verify.twilio.com/v2/Services/VA999888777/Verifications',
      expect.objectContaining({
        method: 'POST',
        signal: expect.any(AbortSignal),
      }),
    );
    expect(sendRes).toEqual({
      sent: true,
      provider: 'twilio-verify',
      sid: 'VE123456',
    });

    const approved = await service.checkVerificationCode(
      '+573001234567',
      '654321',
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'https://verify.twilio.com/v2/Services/VA999888777/VerificationCheck',
      expect.objectContaining({
        method: 'POST',
        signal: expect.any(AbortSignal),
      }),
    );
    expect(approved).toBe(true);
  });
});
