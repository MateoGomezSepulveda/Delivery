import { create } from 'zustand';

interface CartDrawerState {
  isOpen: boolean;
  activeAddressLabel: string;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  setActiveAddressLabel: (label: string) => void;
}

export const useCartDrawerStore = create<CartDrawerState>((set) => ({
  isOpen: false,
  activeAddressLabel: 'Calle 85 # 15-32, Bogotá',
  openDrawer: () => set({ isOpen: true }),
  closeDrawer: () => set({ isOpen: false }),
  toggleDrawer: () => set((state) => ({ isOpen: !state.isOpen })),
  setActiveAddressLabel: (label) => set({ activeAddressLabel: label }),
}));
