import { Test, TestingModule } from '@nestjs/testing';
import { EventsGateway, RIDERS_AVAILABLE_ROOM } from './events.gateway';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('EventsGateway', () => {
  let gateway: EventsGateway;
  const mockJwtService = {
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsGateway,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('secret') },
        },
      ],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('une a usuarios con rol DELIVERY a la sala riders_available al conectarse', async () => {
    mockJwtService.verify.mockReturnValue({
      sub: 'rider-123',
      role: 'DELIVERY',
    });

    const mockClient = {
      id: 'sock-1',
      handshake: {
        auth: { token: 'Bearer valid-token' },
        headers: {},
        query: {},
      },
      join: jest.fn(),
      disconnect: jest.fn(),
    } as any;

    await gateway.handleConnection(mockClient);

    expect(mockClient.join).toHaveBeenCalledWith('rider-123');
    expect(mockClient.join).toHaveBeenCalledWith(RIDERS_AVAILABLE_ROOM);
    expect(mockClient.disconnect).not.toHaveBeenCalled();
  });

  it('emite new_available_order y order_taken hacia la sala riders_available', () => {
    const emitMock = jest.fn();
    const toMock = jest.fn().mockReturnValue({ emit: emitMock });
    gateway.server = { to: toMock } as any;

    gateway.emitNewAvailableOrder({ _id: 'ord-1', status: 'PREPARING' });
    expect(toMock).toHaveBeenCalledWith(RIDERS_AVAILABLE_ROOM);
    expect(emitMock).toHaveBeenCalledWith('new_available_order', {
      _id: 'ord-1',
      status: 'PREPARING',
    });

    gateway.emitOrderTaken('ord-1', 'rider-123');
    expect(emitMock).toHaveBeenCalledWith('order_taken', {
      orderId: 'ord-1',
      takenBy: 'rider-123',
    });
  });
});
