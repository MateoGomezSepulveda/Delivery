import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';

describe('DeliveryController', () => {
  let controller: DeliveryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryController],
      providers: [
        {
          provide: DeliveryService,
          useValue: {
            createProfile: jest.fn(),
            getMyProfile: jest.fn(),
            updateAvailability: jest.fn(),
            updateLocation: jest.fn(),
            getAvailableOrders: jest.fn(),
            acceptOrder: jest.fn(),
            deliverOrder: jest.fn(),
            getMyStats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DeliveryController>(DeliveryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
