import { Test, TestingModule } from '@nestjs/testing';
import { UploadsService } from './uploads.service';
import { ConfigService } from '@nestjs/config';

// Mock simple de uuid
jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('mocked-uuid'),
}));

// Mock simple de S3
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue(true),
  })),
  PutObjectCommand: jest.fn(),
}));

describe('UploadsService', () => {
  let service: UploadsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'AWS_S3_BUCKET') return 'test-bucket';
              if (key === 'AWS_S3_REGION') return 'us-east-1';
              return 'mocked-key';
            }),
          },
        },
      ],
    }).compile();

    service = module.get<UploadsService>(UploadsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should upload file and return url', async () => {
    const mockFile = {
      originalname: 'test.jpg',
      buffer: Buffer.from('test'),
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    const url = await service.uploadFile(mockFile, 'products');
    expect(url).toBe(
      'https://test-bucket.s3.us-east-1.amazonaws.com/products/mocked-uuid.jpg',
    );
  });
});
