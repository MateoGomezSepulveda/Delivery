import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Address, AppliedCouponResult } from '@/types/order.types';

export const CART_UI_STORAGE_KEY = 'deliverypro_cart_ui_v1';
export const DEFAULT_ADDRESS_LABEL = 'Seleccionar dirección de entrega';

interface CartUiState {
  activeAddressLabel: string;
  selectedAddress: Address | null;
  appliedCoupon: AppliedCouponResult | null;
  setSelectedAddress: (address: Address | null) => void;
  setActiveAddressLabel: (label: string) => void;
  setAppliedCoupon: (coupon: AppliedCouponResult | null) => void;
  resetCartUi: () => void;
}

export const useCartUiStore = create<CartUiState>()(
  persist(
    (set) => ({
      activeAddressLabel: DEFAULT_ADDRESS_LABEL,
      selectedAddress: null,
      appliedCoupon: null,

      setSelectedAddress: (address) =>
        set({
          selectedAddress: address,
          activeAddressLabel: address
            ? `${address.title}: ${address.street}, ${address.city}`
            : DEFAULT_ADDRESS_LABEL,
        }),

      setActiveAddressLabel: (label) => set({ activeAddressLabel: label }),

      setAppliedCoupon: (coupon) => set({ appliedCoupon: coupon }),

      resetCartUi: () => {
        set({
          activeAddressLabel: DEFAULT_ADDRESS_LABEL,
          selectedAddress: null,
          appliedCoupon: null,
        });
      },
    }),
    {
      name: CART_UI_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
