import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

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
});
