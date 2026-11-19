import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Address, AppliedCouponResult } from '@/types/order.types';

export const CART_UI_STORAGE_KEY = 'delivery_cart_ui_v1';
export const DEFAULT_ADDRESS_LABEL = 'Seleccionar dirección de entrega';

interface CartDrawerState {
  isOpen: boolean;
  isAddressModalOpen: boolean;
  activeAddressLabel: string;
  selectedAddress: Address | null;
  appliedCoupon: AppliedCouponResult | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  openAddressModal: () => void;
  closeAddressModal: () => void;
  setSelectedAddress: (address: Address | null) => void;
  setActiveAddressLabel: (label: string) => void;
  setAppliedCoupon: (coupon: AppliedCouponResult | null) => void;
  resetCartUi: () => void;
}

export const useCartDrawerStore = create<CartDrawerState>()(
  persist(
    (set) => ({
      isOpen: false,
      isAddressModalOpen: false,
      activeAddressLabel: DEFAULT_ADDRESS_LABEL,
      selectedAddress: null,
      appliedCoupon: null,
      openDrawer: () => set({ isOpen: true }),
      closeDrawer: () => set({ isOpen: false }),
      toggleDrawer: () => set((state) => ({ isOpen: !state.isOpen })),
      openAddressModal: () => set({ isAddressModalOpen: true }),
      closeAddressModal: () => set({ isAddressModalOpen: false }),
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
          isOpen: false,
          isAddressModalOpen: false,
          activeAddressLabel: DEFAULT_ADDRESS_LABEL,
          selectedAddress: null,
          appliedCoupon: null,
        });
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(CART_UI_STORAGE_KEY);
        }
      },
    }),
    {
      name: CART_UI_STORAGE_KEY,
      partialize: (state) => ({
        activeAddressLabel: state.activeAddressLabel,
        selectedAddress: state.selectedAddress,
        appliedCoupon: state.appliedCoupon,
      }),
    },
  ),
);
