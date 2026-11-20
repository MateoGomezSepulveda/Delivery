import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { UploadsService } from './uploads.service';

jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('mocked-uuid'),
}));

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: (...args: unknown[]) => mockSend(...args),
  })),
  PutObjectCommand: jest.fn((input) => ({ __type: 'PutObject', input })),
  DeleteObjectCommand: jest.fn((input) => ({ __type: 'DeleteObject', input })),
}));

const VALID_JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const VALID_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]);
const VALID_WEBP = Buffer.concat([
  Buffer.from('RIFF', 'ascii'),
  Buffer.from([0x24, 0x00, 0x00, 0x00]),
  Buffer.from('WEBP', 'ascii'),
]);

describe('UploadsService', () => {
  let service: UploadsService;
  let configMap: Record<string, string>;

  const buildModule = async (overrides: Record<string, string> = {}) => {
    configMap = {
      AWS_S3_BUCKET: 'test-bucket',
      AWS_S3_REGION: 'us-east-1',
      AWS_ACCESS_KEY_ID: 'mocked-key',
      AWS_SECRET_ACCESS_KEY: 'mocked-secret',
      ...overrides,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => configMap[key]),
          },
        },
      ],
    }).compile();

    return module.get<UploadsService>(UploadsService);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue(true);
    service = await buildModule();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(S3Client).toHaveBeenCalled();
  });

  it('sube imagen JPEG válida tras verificar magic bytes y retorna URL S3', async () => {
    const mockFile = {
      originalname: 'producto.jpg',
      buffer: VALID_JPEG,
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    const url = await service.uploadFile(mockFile, 'products');

    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'test-bucket',
        Key: 'products/mocked-uuid.jpg',
        ContentType: 'image/jpeg',
      }),
    );
    expect(url).toBe(
      'https://test-bucket.s3.us-east-1.amazonaws.com/products/mocked-uuid.jpg',
    );
  });

  it('detecta firmas binarias PNG y WEBP y usa AWS_CLOUDFRONT_DOMAIN si está configurado', async () => {
    const cfService = await buildModule({
      AWS_CLOUDFRONT_DOMAIN: 'https://cdn.deliverypro.com/',
    });

    const pngUrl = await cfService.uploadFile(
      {
        originalname: 'avatar.png',
        buffer: VALID_PNG,
        mimetype: 'image/png',
      } as Express.Multer.File,
      'avatars',
    );
    expect(pngUrl).toBe('https://cdn.deliverypro.com/avatars/mocked-uuid.png');

    const webpUrl = await cfService.uploadFile(
      {
        originalname: 'banner.webp',
        buffer: VALID_WEBP,
        mimetype: 'image/webp',
      } as Express.Multer.File,
      'products',
    );
    expect(webpUrl).toBe(
      'https://cdn.deliverypro.com/products/mocked-uuid.webp',
    );
  });

  it('rechaza archivos maliciosos o texto renombrados a .jpg sin firma binaria válida', async () => {
    const fakeFile = {
      originalname: 'malware.jpg',
      buffer: Buffer.from('<script>alert(1)</script>'),
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    await expect(service.uploadFile(fakeFile, 'products')).rejects.toThrow(
      BadRequestException,
    );
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('elimina archivo anterior en S3 cuando la URL pertenece al bucket configurado', async () => {
    const deleted = await service.deleteFile(
      'https://test-bucket.s3.us-east-1.amazonaws.com/products/old-img.jpg',
    );

    expect(deleted).toBe(true);
    expect(DeleteObjectCommand).toHaveBeenCalledWith({
      Bucket: 'test-bucket',
      Key: 'products/old-img.jpg',
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('ignora sin error URLs externas o data URLs en deleteFile', async () => {
    expect(
      await service.deleteFile('https://images.unsplash.com/photo-123.jpg'),
    ).toBe(false);
    expect(await service.deleteFile('data:image/jpeg;base64,/9j/4AAQ')).toBe(
      false,
    );
    expect(await service.deleteFile(null)).toBe(false);
    expect(mockSend).not.toHaveBeenCalled();
  });
});
