import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  MessageSquare,
  Minus,
  Plus,
  ShoppingBag,
  Star,
  Tag,
  Trash2,
  X,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { extractErrorMessage } from '@/api/axios.client';
import {
  deleteReviewApi,
  getProductReviewsApi,
} from '@/api/endpoints/reviews.api';
import { resolveCategoryName } from '@/components/catalog/ProductCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/store/useToastStore';
import { FONTS, useAppTheme } from '@/theme/colors';
import type { Product, Review } from '@/types/catalog.types';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { getProductStockState } from '@/utils/inventory';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80';

export interface ProductDetailModalProps {
  product: Product | null;
  categoryName?: string;
  isAdding?: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
}

export function ProductDetailModal({
  product,
  categoryName,
  isAdding = false,
  onClose,
  onAddToCart,
}: ProductDetailModalProps) {
  const colors = useAppTheme();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [quantity, setQuantity] = useState(1);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setQuantity(1);
    setImgError(false);
  }, [product?._id]);

  const { data: reviews = [], isLoading: loadingReviews } = useQuery({
    queryKey: ['reviews', product?._id],
    queryFn: () => getProductReviewsApi(product!._id),
    enabled: Boolean(product?._id),
  });

  const deleteReviewMutation = useMutation({
    mutationFn: (reviewId: string) => deleteReviewApi(reviewId),
    onSuccess: () => {
      if (product?._id) {
        void queryClient.invalidateQueries({
          queryKey: ['reviews', product._id],
        });
      }
      toast.info('Reseña eliminada');
    },
    onError: (err) => {
      toast.error('No se pudo eliminar la reseña', {
        description: extractErrorMessage(err),
      });
    },
  });

  if (!product) return null;

  const stockState = getProductStockState(product);
  const maxQuantity =
    stockState.stock !== null ? Math.max(1, stockState.stock) : 99;
  const catLabel = resolveCategoryName(product.categoryId, categoryName);
  const imageUri =
    !imgError && product.image?.trim() ? product.image.trim() : FALLBACK_IMAGE;

  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
        ).toFixed(1)
      : null;

  const canDeleteReview = (review: Review) => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    const authorId =
      typeof review.user === 'object' && review.user !== null
        ? review.user._id
        : String(review.user);
    return authorId === user._id;
  };

  return (
    <Modal
      visible={Boolean(product)}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* Botón cerrar flotante */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar detalle del producto"
            onPress={onClose}
            style={[
              styles.closeBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderStrong,
              },
            ]}
          >
            <X size={19} color={colors.text} strokeWidth={2.2} />
          </Pressable>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Image
              source={{ uri: imageUri }}
              onError={() => setImgError(true)}
              resizeMode="cover"
              style={styles.heroImage}
            />

            <View style={styles.contentPad}>
              <View style={styles.badgesRow}>
                <Badge variant="primary" icon={Tag}>
                  {catLabel}
                </Badge>
                {stockState.isOutOfStock ? (
                  <Badge variant="danger">Agotado</Badge>
                ) : stockState.isLowStock ? (
                  <Badge variant="warning">
                    Quedan {stockState.stock} unidades
                  </Badge>
                ) : (
                  <Badge variant="success">En stock</Badge>
                )}
              </View>

              <Text style={[styles.title, { color: colors.text }]}>
                {product.name}
              </Text>

              <View style={styles.priceRatingRow}>
                <Text style={[styles.price, { color: colors.primary }]}>
                  {formatCurrency(product.price)}
                </Text>

                {avgRating ? (
                  <View
                    style={[
                      styles.ratingPill,
                      {
                        backgroundColor: colors.warningSoft,
                        borderColor: colors.warningBorder,
                      },
                    ]}
                  >
                    <Star
                      size={14}
                      color="#F59E0B"
                      fill="#F59E0B"
                      strokeWidth={2}
                    />
                    <Text style={[styles.ratingText, { color: colors.text }]}>
                      {avgRating} ({reviews.length})
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={[styles.desc, { color: colors.textSecondary }]}>
                {product.description ||
                  'Producto disponible con entrega rápida a domicilio.'}
              </Text>

              {stockState.lowStockLabel ? (
                <View
                  style={[
                    styles.lowStockBox,
                    {
                      backgroundColor: colors.warningSoft,
                      borderColor: colors.warningBorder,
                    },
                  ]}
                >
                  <AlertTriangle
                    size={16}
                    color={colors.warning}
                    strokeWidth={2.2}
                  />
                  <Text
                    style={[styles.lowStockLabel, { color: colors.warning }]}
                  >
                    {stockState.lowStockLabel}
                  </Text>
                </View>
              ) : null}

              {/* Reseñas verificadas */}
              <View
                style={[
                  styles.reviewsSection,
                  { borderTopColor: colors.border },
                ]}
              >
                <View style={styles.reviewsHeader}>
                  <MessageSquare
                    size={16}
                    color={colors.primary}
                    strokeWidth={2.1}
                  />
                  <Text style={[styles.reviewsTitle, { color: colors.text }]}>
                    Reseñas verificadas ({reviews.length})
                  </Text>
                </View>

                {loadingReviews ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                    style={{ marginVertical: 14 }}
                  />
                ) : reviews.length === 0 ? (
                  <Text
                    style={[styles.noReviews, { color: colors.textMuted }]}
                  >
                    Aún no hay reseñas para este producto. ¡Sé el primero en
                    calificarlo tras recibir tu pedido!
                  </Text>
                ) : (
                  <View style={styles.reviewsList}>
                    {reviews.map((rev) => {
                      const authorName =
                        typeof rev.user === 'object' && rev.user !== null
                          ? rev.user.name
                          : 'Cliente Verificado';

                      return (
                        <View
                          key={rev._id}
                          style={[
                            styles.reviewCard,
                            {
                              backgroundColor: colors.surfaceMuted,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <View style={styles.reviewTop}>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.reviewAuthor,
                                  { color: colors.text },
                                ]}
                              >
                                {authorName}
                              </Text>
                              {rev.createdAt ? (
                                <Text
                                  style={[
                                    styles.reviewDate,
                                    { color: colors.textMuted },
                                  ]}
                                >
                                  {formatDateTime(rev.createdAt)}
                                </Text>
                              ) : null}
                            </View>

                            <View style={styles.starsRow}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={13}
                                  color="#F59E0B"
                                  fill={
                                    star <= rev.rating
                                      ? '#F59E0B'
                                      : 'transparent'
                                  }
                                  strokeWidth={2}
                                />
                              ))}
                            </View>

                            {canDeleteReview(rev) ? (
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Eliminar reseña"
                                onPress={() =>
                                  deleteReviewMutation.mutate(rev._id)
                                }
                                style={styles.deleteReviewBtn}
                              >
                                <Trash2
                                  size={15}
                                  color={colors.danger}
                                  strokeWidth={2}
                                />
                              </Pressable>
                            ) : null}
                          </View>

                          {rev.comment ? (
                            <Text
                              style={[
                                styles.reviewComment,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {rev.comment}
                            </Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Barra fija inferior de cantidad + Agregar al carrito */}
          <View
            style={[
              styles.bottomBar,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.qtySelector,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.borderStrong,
                },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Disminuir cantidad"
                disabled={quantity <= 1 || stockState.isOutOfStock}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                style={styles.qtyBtn}
              >
                <Minus
                  size={16}
                  color={quantity <= 1 ? colors.textMuted : colors.text}
                  strokeWidth={2.2}
                />
              </Pressable>

              <Text style={[styles.qtyText, { color: colors.text }]}>
                {quantity}
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Aumentar cantidad"
                disabled={quantity >= maxQuantity || stockState.isOutOfStock}
                onPress={() =>
                  setQuantity((q) => Math.min(maxQuantity, q + 1))
                }
                style={styles.qtyBtn}
              >
                <Plus
                  size={16}
                  color={
                    quantity >= maxQuantity ? colors.textMuted : colors.text
                  }
                  strokeWidth={2.2}
                />
              </Pressable>
            </View>

            <View style={{ flex: 1 }}>
              <Button
                title={
                  stockState.isOutOfStock
                    ? 'Producto Agotado'
                    : `Agregar · ${formatCurrency(product.price * quantity)}`
                }
                size="lg"
                fullWidth
                disabled={stockState.isOutOfStock}
                loading={isAdding}
                leftIcon={
                  !stockState.isOutOfStock ? (
                    <ShoppingBag size={18} color="#FFFFFF" strokeWidth={2.2} />
                  ) : undefined
                }
                onPress={() => onAddToCart(product, quantity)}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.62)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heroImage: {
    width: '100%',
    height: 230,
  },
  contentPad: {
    padding: 18,
    gap: 10,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 22,
  },
  priceRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  price: {
    fontFamily: FONTS.heading,
    fontSize: 24,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ratingText: {
    fontFamily: FONTS.sansBold,
    fontSize: 12.5,
  },
  desc: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    lineHeight: 21,
  },
  lowStockBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  lowStockLabel: {
    fontFamily: FONTS.sansSemi,
    fontSize: 12.5,
  },
  reviewsSection: {
    marginTop: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 10,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  reviewsTitle: {
    fontFamily: FONTS.headingSemi,
    fontSize: 15.5,
  },
  noReviews: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  reviewsList: {
    gap: 9,
  },
  reviewCard: {
    borderRadius: 15,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  reviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewAuthor: {
    fontFamily: FONTS.sansBold,
    fontSize: 13,
  },
  reviewDate: {
    fontFamily: FONTS.sans,
    fontSize: 11,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  deleteReviewBtn: {
    padding: 6,
  },
  reviewComment: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    lineHeight: 18.5,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  qtySelector: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 6,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    minWidth: 28,
    textAlign: 'center',
    fontFamily: FONTS.heading,
    fontSize: 16,
  },
});
