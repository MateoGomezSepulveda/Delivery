import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryService } from './delivery.service';
import { getModelToken } from '@nestjs/mongoose';
import { DeliveryProfile } from './schemas/delivery-profile.schema';
import { Order } from 'src/orders/schemas/order.schema';
import { EventsGateway } from 'src/events/events/events.gateway';

describe('DeliveryService', () => {
  let service: DeliveryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryService,
        {
          provide: getModelToken(DeliveryProfile.name),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            findOneAndUpdate: jest.fn(),
          },
        },
        {
          provide: getModelToken(Order.name),
          useValue: {
            find: jest.fn(),
            findById: jest.fn(),
            countDocuments: jest.fn(),
          },
        },
        {
          provide: EventsGateway,
          useValue: {
            emitOrderStatusUpdate: jest.fn(),
            emitDeliveryLocationUpdate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DeliveryService>(DeliveryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
