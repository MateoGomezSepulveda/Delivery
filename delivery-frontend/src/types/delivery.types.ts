import type { Order } from '@/types/order.types';

export type VehicleType = 'MOTO' | 'CAR' | 'BICYCLE';

export interface DeliveryProfile {
  _id: string;
  userId: string;
  vehicleType: VehicleType;
  plate?: string;
  isAvailable: boolean;
  currentLocation?: { lat: number; lng: number };
}

export interface CreateDeliveryProfilePayload {
  vehicleType: VehicleType;
  plate?: string;
}

export interface DeliveryStats {
  delivered: number;
  inProgress: number;
}

export type DeliveryOrder = Order;
