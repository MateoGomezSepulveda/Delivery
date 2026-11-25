import { useMutation, useQueryClient } from '@tanstack/react-query';
import { extractErrorMessage } from '@/api/axios.client';
import {
  addToCartApi,
  clearCartApi,
  removeFromCartApi,
  updateCartItemQuantityApi,
} from '@/api/endpoints/cart.api';
import { toast } from '@/store/useToastStore';
import type { Product } from '@/types/catalog.types';
import type { Cart } from '@/types/order.types';

export function useCartMutations(options?: {
  onAddSuccess?: (
    cart: Cart,
    variables: { productId: string; quantity: number; product?: Product },
  ) => void;
}) {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: ({
      productId,
      quantity = 1,
    }: {
      productId: string;
      quantity?: number;
      product?: Product;
    }) => addToCartApi(productId, quantity),
    onSuccess: (updatedCart, variables) => {
      queryClient.setQueryData(['cart'], updatedCart);
      options?.onAddSuccess?.(updatedCart, {
        productId: variables.productId,
        quantity: variables.quantity ?? 1,
        product: variables.product,
      });
    },
    onError: (err) => {
      toast.error('No se pudo agregar al carrito', {
        description: extractErrorMessage(err),
      });
    },
  });

  const updateQuantityMutation = useMutation({
    mutationFn: ({
      productId,
      quantity,
    }: {
      productId: string;
      quantity: number;
    }) => updateCartItemQuantityApi(productId, quantity),
    onMutate: async ({ productId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previousCart = queryClient.getQueryData<Cart>(['cart']);
      if (previousCart) {
        const nextItems =
          quantity <= 0
            ? previousCart.items.filter((item) => {
                const id =
                  typeof item.productId === 'object' && item.productId !== null
                    ? item.productId._id
                    : String(item.productId);
                return id !== productId;
              })
            : previousCart.items.map((item) => {
                const id =
                  typeof item.productId === 'object' && item.productId !== null
                    ? item.productId._id
                    : String(item.productId);
                return id === productId ? { ...item, quantity } : item;
              });

        const nextTotal = nextItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        );
        queryClient.setQueryData<Cart>(['cart'], {
          ...previousCart,
          items: nextItems,
          total: nextTotal,
        });
      }
      return { previousCart };
    },
    onError: (err, _vars, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(['cart'], context.previousCart);
      }
      toast.error('No se pudo actualizar la cantidad', {
        description: extractErrorMessage(err),
      });
    },
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(['cart'], updatedCart);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => removeFromCartApi(productId),
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(['cart'], updatedCart);
      toast.info('Producto eliminado del carrito');
    },
    onError: (err) => {
      toast.error('No se pudo eliminar el producto', {
        description: extractErrorMessage(err),
      });
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => clearCartApi(),
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(['cart'], updatedCart);
      toast.info('Carrito vaciado');
    },
    onError: (err) => {
      toast.error('No se pudo vaciar el carrito', {
        description: extractErrorMessage(err),
      });
    },
  });

  return {
    addMutation,
    updateQuantityMutation,
    removeMutation,
    clearMutation,
  };
}
