import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  addToCartApi,
  clearCartApi,
  removeFromCartApi,
} from '@/api/endpoints/cart.api';
import { extractErrorMessage } from '@/api/axios.client';
import type { Product } from '@/types/catalog.types';
import type { Cart, CartItem } from '@/types/order.types';
import { useCartDrawerStore } from '@/store/useCartDrawerStore';

interface AddToCartVariables {
  productId: string;
  quantity: number;
  product?: Product;
}

interface CartMutationContext {
  previousCart?: Cart;
}

function getItemProductId(item: CartItem): string {
  return typeof item.productId === 'object' && item.productId !== null
    ? item.productId._id
    : item.productId;
}

function calculateCartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function useCartMutations(options?: {
  onAddSuccess?: (updatedCart: Cart, variables: AddToCartVariables) => void;
}) {
  const queryClient = useQueryClient();
  const { setAppliedCoupon } = useCartDrawerStore();

  const addMutation = useMutation<
    Cart,
    unknown,
    AddToCartVariables,
    CartMutationContext
  >({
    mutationFn: ({ productId, quantity }) => addToCartApi(productId, quantity),
    onMutate: async ({ productId, quantity, product }) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previousCart = queryClient.getQueryData<Cart>(['cart']);

      queryClient.setQueryData<Cart | undefined>(['cart'], (current) => {
        if (!current) {
          if (!product) return current;
          const items: CartItem[] = [
            { productId: product, quantity, price: product.price },
          ];
          return {
            _id: 'optimistic-cart',
            userId: '',
            status: 'ACTIVE',
            items,
            total: calculateCartTotal(items),
          };
        }

        const existingIndex = current.items.findIndex(
          (item) => getItemProductId(item) === productId,
        );

        let nextItems: CartItem[];
        if (existingIndex >= 0) {
          nextItems = current.items.map((item, idx) =>
            idx === existingIndex
              ? { ...item, quantity: item.quantity + quantity }
              : item,
          );
        } else if (product) {
          nextItems = [
            ...current.items,
            { productId: product, quantity, price: product.price },
          ];
        } else {
          return current;
        }

        return {
          ...current,
          items: nextItems,
          total: calculateCartTotal(nextItems),
        };
      });

      return { previousCart };
    },
    onError: (err, _vars, context) => {
      if (context && 'previousCart' in context) {
        queryClient.setQueryData(['cart'], context.previousCart);
      }
      toast.error('No se pudo actualizar el carrito', {
        description: extractErrorMessage(err),
      });
    },
    onSuccess: (updatedCart, variables) => {
      queryClient.setQueryData(['cart'], updatedCart);
      options?.onAddSuccess?.(updatedCart, variables);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const removeMutation = useMutation<Cart, unknown, string, CartMutationContext>(
    {
      mutationFn: (productId) => removeFromCartApi(productId),
      onMutate: async (productId) => {
        await queryClient.cancelQueries({ queryKey: ['cart'] });
        const previousCart = queryClient.getQueryData<Cart>(['cart']);

        queryClient.setQueryData<Cart | undefined>(['cart'], (current) => {
          if (!current) return current;
          const nextItems = current.items.filter(
            (item) => getItemProductId(item) !== productId,
          );
          return {
            ...current,
            items: nextItems,
            total: calculateCartTotal(nextItems),
          };
        });

        return { previousCart };
      },
      onError: (err, _productId, context) => {
        if (context && 'previousCart' in context) {
          queryClient.setQueryData(['cart'], context.previousCart);
        }
        toast.error('Error al remover producto', {
          description: extractErrorMessage(err),
        });
      },
      onSuccess: (updatedCart) => {
        queryClient.setQueryData(['cart'], updatedCart);
        if (!updatedCart.items?.length) {
          setAppliedCoupon(null);
        }
        toast.success('Producto eliminado del carrito');
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['cart'] });
      },
    },
  );

  const clearMutation = useMutation<Cart, unknown, void, CartMutationContext>({
    mutationFn: clearCartApi,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previousCart = queryClient.getQueryData<Cart>(['cart']);

      queryClient.setQueryData<Cart | undefined>(['cart'], (current) =>
        current
          ? {
              ...current,
              items: [],
              total: 0,
            }
          : current,
      );

      return { previousCart };
    },
    onError: (err, _vars, context) => {
      if (context && 'previousCart' in context) {
        queryClient.setQueryData(['cart'], context.previousCart);
      }
      toast.error('No se pudo vaciar el carrito', {
        description: extractErrorMessage(err),
      });
    },
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(['cart'], updatedCart);
      setAppliedCoupon(null);
      toast.success('Carrito vaciado correctamente');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  return {
    addMutation,
    removeMutation,
    clearMutation,
  };
}
