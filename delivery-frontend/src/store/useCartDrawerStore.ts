import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Address, AppliedCouponResult } from '@/types/order.types';

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
}

export const useCartDrawerStore = create<CartDrawerState>()(
  persist(
    (set) => ({
      isOpen: false,
      isAddressModalOpen: false,
      activeAddressLabel: 'Seleccionar dirección de entrega',
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
            : 'Seleccionar dirección de entrega',
        }),
      setActiveAddressLabel: (label) => set({ activeAddressLabel: label }),
      setAppliedCoupon: (coupon) => set({ appliedCoupon: coupon }),
    }),
    {
      name: 'delivery_cart_ui_v1',
      partialize: (state) => ({
        activeAddressLabel: state.activeAddressLabel,
        selectedAddress: state.selectedAddress,
        appliedCoupon: state.appliedCoupon,
      }),
    },
  ),
);
