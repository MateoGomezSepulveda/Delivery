import type { Order } from '@/types/order.types';
import type { UserRole } from '@/types/api.types';

export type VehicleType = 'MOTO' | 'CAR' | 'BICYCLE';
export type DeliveryProfileStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface DeliveryProfileUserPopulated {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string | null;
  isEmailVerified?: boolean;
}

export interface DeliveryProfile {
  _id: string;
  userId: string | DeliveryProfileUserPopulated;
  vehicleType: VehicleType;
  plate?: string;
  licensePlate?: string;
  phone?: string;
  status?: DeliveryProfileStatus;
  rejectionReason?: string;
  reviewedAt?: string;
  isAvailable: boolean;
  totalDeliveries?: number;
  currentLocation?: { lat: number; lng: number };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDeliveryProfilePayload {
  vehicleType: VehicleType;
  plate?: string;
  licensePlate?: string;
  phone?: string;
}

export interface ReviewDeliveryProfilePayload {
  status: 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
}

export interface DeliveryStats {
  delivered: number;
  inProgress: number;
  deliveredToday?: number;
  totalOrderValue?: number;
  estimatedEarnings?: number;
}

export interface DeliveryOrderHistoryItem extends Order {
  riderEarning?: number;
}

export type DeliveryOrder = Order;
