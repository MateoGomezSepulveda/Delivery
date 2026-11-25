import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Plus,
  Tag,
  XCircle,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { FONTS, useAppTheme } from '@/theme/colors';
import type { Category, Product } from '@/types/catalog.types';
import { formatCurrency } from '@/utils/formatters';
import { getProductStockState } from '@/utils/inventory';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80';

export interface ProductCardProps {
  product: Product;
  categoryName?: string;
  isAdding?: boolean;
  onAddToCart: (product: Product) => void;
  onViewDetail: (product: Product) => void;
}

export function resolveCategoryName(
  categoryId: Product['categoryId'],
  fallbackName?: string,
): string {
  if (fallbackName) return fallbackName;
  if (categoryId && typeof categoryId === 'object' && 'name' in categoryId) {
    return (categoryId as Category).name;
  }
  return 'Catálogo';
}

export function ProductCard({
  product,
  categoryName,
  isAdding = false,
  onAddToCart,
  onViewDetail,
}: ProductCardProps) {
  const colors = useAppTheme();
  const [imgError, setImgError] = useState(false);

  const stockState = getProductStockState(product);
  const catLabel = resolveCategoryName(product.categoryId, categoryName);
  const imageUri =
    !imgError && product.image?.trim() ? product.image.trim() : FALLBACK_IMAGE;

  return (
    <Pressable
      onPress={() => onViewDetail(product)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.96 : 1,
        },
      ]}
    >
      {/* Imagen 4:3 con Píldoras Superpuestas */}
      <View style={[styles.imageWrap, { backgroundColor: colors.surfaceMuted }]}>
        <Image
          source={{ uri: imageUri }}
          onError={() => setImgError(true)}
          resizeMode="cover"
          style={[
            styles.image,
            stockState.isOutOfStock && styles.imageOutOfStock,
          ]}
        />

        {/* Categoría */}
        <View style={styles.topOverlayRow}>
          <View style={styles.categoryPill}>
            <Tag size={11} color="#EA580C" strokeWidth={2.2} />
            <Text numberOfLines={1} style={styles.categoryPillText}>
              {catLabel}
            </Text>
          </View>

          {/* Estado de Stock */}
          {stockState.isOutOfStock ? (
            <View style={[styles.stockPill, { backgroundColor: '#DC2626' }]}>
              <XCircle size={11} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.stockPillText}>Agotado</Text>
            </View>
          ) : stockState.isLowStock ? (
            <View style={[styles.stockPill, { backgroundColor: '#D97706' }]}>
              <AlertTriangle size={11} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.stockPillText}>
                Quedan {stockState.stock} uds
              </Text>
            </View>
          ) : (
            <View style={[styles.stockPill, { backgroundColor: '#059669' }]}>
              <CheckCircle2 size={11} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.stockPillText}>Disponible</Text>
            </View>
          )}
        </View>
      </View>

      {/* Contenido */}
      <View style={styles.body}>
        <Text
          numberOfLines={1}
          style={[styles.productTitle, { color: colors.text }]}
        >
          {product.name}
        </Text>

        <Text
          numberOfLines={2}
          style={[styles.productDesc, { color: colors.textSecondary }]}
        >
          {product.description || 'Producto selecto con entrega inmediata.'}
        </Text>

        {stockState.lowStockLabel ? (
          <View
            style={[
              styles.lowStockBanner,
              {
                backgroundColor: colors.warningSoft,
                borderColor: colors.warningBorder,
              },
            ]}
          >
            <AlertTriangle size={13} color={colors.warning} strokeWidth={2.2} />
            <Text style={[styles.lowStockText, { color: colors.warning }]}>
              {stockState.lowStockLabel}
            </Text>
          </View>
        ) : null}

        {/* Pie: Precio + Detalle + Agregar */}
        <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
          <View style={styles.priceCol}>
            <Text style={[styles.priceLabel, { color: colors.textMuted }]}>
              Precio
            </Text>
            <Text style={[styles.priceValue, { color: colors.text }]}>
              {formatCurrency(product.price)}
            </Text>
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ver detalle de ${product.name}`}
              onPress={() => onViewDetail(product)}
              style={[
                styles.eyeBtn,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.borderStrong,
                },
              ]}
            >
              <Eye size={17} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>

            <Button
              title={stockState.isOutOfStock ? 'Agotado' : 'Agregar'}
              size="sm"
              variant={stockState.isOutOfStock ? 'outline' : 'primary'}
              disabled={stockState.isOutOfStock}
              loading={isAdding}
              leftIcon={
                !stockState.isOutOfStock ? (
                  <Plus size={15} color="#FFFFFF" strokeWidth={2.4} />
                ) : undefined
              }
              onPress={() => onAddToCart(product)}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 16 / 10,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOutOfStock: {
    opacity: 0.55,
  },
  topOverlayRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  categoryPill: {
    maxWidth: '58%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  categoryPillText: {
    fontFamily: FONTS.sansBold,
    fontSize: 11,
    color: '#0F172A',
  },
  stockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  stockPillText: {
    fontFamily: FONTS.sansBold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  body: {
    padding: 14,
    gap: 6,
  },
  productTitle: {
    fontFamily: FONTS.heading,
    fontSize: 16.5,
  },
  productDesc: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    lineHeight: 18.5,
  },
  lowStockBanner: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  lowStockText: {
    fontFamily: FONTS.sansSemi,
    fontSize: 11.5,
  },
  footerRow: {
    marginTop: 8,
    paddingTop: 11,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  priceCol: {
    flex: 1,
  },
  priceLabel: {
    fontFamily: FONTS.sansMedium,
    fontSize: 11,
  },
  priceValue: {
    fontFamily: FONTS.heading,
    fontSize: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyeBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
