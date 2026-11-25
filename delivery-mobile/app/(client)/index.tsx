import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  Wine,
  X,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getCategoriesApi } from '@/api/endpoints/categories.api';
import { getProductsApi } from '@/api/endpoints/products.api';
import { ProductCard } from '@/components/catalog/ProductCard';
import { ProductDetailModal } from '@/components/catalog/ProductDetailModal';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCartMutations } from '@/hooks/useCartMutations';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/store/useToastStore';
import { FONTS, useAppTheme } from '@/theme/colors';
import type {
  Product,
  ProductSortBy,
  SortOrder,
} from '@/types/catalog.types';

type SortOptionKey = 'recent' | 'price_asc' | 'price_desc' | 'name_asc';

const SORT_OPTIONS: {
  key: SortOptionKey;
  label: string;
  sortBy: ProductSortBy;
  sortOrder: SortOrder;
}[] = [
  {
    key: 'recent',
    label: 'Más recientes',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
  {
    key: 'price_asc',
    label: 'Menor precio',
    sortBy: 'price',
    sortOrder: 'asc',
  },
  {
    key: 'price_desc',
    label: 'Mayor precio',
    sortBy: 'price',
    sortOrder: 'desc',
  },
  {
    key: 'name_asc',
    label: 'Nombre A-Z',
    sortBy: 'name',
    sortOrder: 'asc',
  },
];

export default function CatalogScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput.trim(), 350);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sortKey, setSortKey] = useState<SortOptionKey>('recent');
  const [page, setPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);

  const currentSort =
    SORT_OPTIONS.find((s) => s.key === sortKey) ?? SORT_OPTIONS[0];

  const { data: categoriesRes } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategoriesApi({ limit: 50 }),
  });

  const categories = useMemo(
    () => categoriesRes?.data ?? [],
    [categoriesRes?.data],
  );

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((cat) => map.set(cat._id, cat.name));
    return map;
  }, [categories]);

  const {
    data: productsRes,
    isLoading,
    isRefetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      'products',
      {
        page,
        search: debouncedSearch,
        categoryId: selectedCategoryId,
        onlyAvailable,
        sortBy: currentSort.sortBy,
        sortOrder: currentSort.sortOrder,
      },
    ],
    queryFn: () =>
      getProductsApi({
        page,
        limit: 12,
        search: debouncedSearch || undefined,
        categoryId: selectedCategoryId || undefined,
        available: onlyAvailable ? true : undefined,
        sortBy: currentSort.sortBy,
        sortOrder: currentSort.sortOrder,
      }),
  });

  const products = productsRes?.data ?? [];
  const meta = productsRes?.meta ?? { total: 0, page: 1, lastPage: 1 };

  const { addMutation } = useCartMutations({
    onAddSuccess: (_cart, vars) => {
      toast.success('Agregado al carrito', {
        description: vars.product
          ? `${vars.quantity}x ${vars.product.name}`
          : 'Producto añadido a tu bolsa',
      });
    },
  });

  const handleAddToCart = (product: Product, quantity = 1) => {
    if (!isAuthenticated) {
      toast.info('Inicia sesión para comprar', {
        description: 'Ingresa a tu cuenta para armar tu carrito de compras.',
      });
      setSelectedProduct(null);
      router.push('/(auth)/login');
      return;
    }

    setAddingProductId(product._id);
    addMutation.mutate(
      { productId: product._id, quantity, product },
      {
        onSettled: () => setAddingProductId(null),
      },
    );
  };

  const resetFilters = () => {
    setSearchInput('');
    setSelectedCategoryId('');
    setOnlyAvailable(false);
    setSortKey('recent');
    setPage(1);
  };

  const resolveProductCategory = (prod: Product) => {
    if (typeof prod.categoryId === 'string') {
      return categoryMap.get(prod.categoryId);
    }
    if (prod.categoryId && typeof prod.categoryId === 'object') {
      return prod.categoryId.name;
    }
    return undefined;
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Banner Naranja idéntico al Frontend Web */}
        <LinearGradient
          colors={['#EA580C', '#F97316', '#DC2626']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroBadge}>
            <Wine size={13} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.heroBadgeText}>
              Licorería, Cigarrillos, Quesos & Pasabocas a Domicilio
            </Text>
          </View>

          <Text style={styles.heroTitle}>
            Tus licores favoritos, cigarrillos y quesos selectos, directo a tu
            puerta
          </Text>

          <Text style={styles.heroSubtitle}>
            Pide cervezas frías, aguardiente, ron, whisky, cigarrillos y tablas
            de quesos con seguimiento en vivo y pago seguro.
          </Text>

          {/* Barra de búsqueda integrada en el Hero */}
          <View style={styles.searchBox}>
            <Search size={18} color="#64748B" strokeWidth={2.2} />
            <TextInput
              value={searchInput}
              onChangeText={(txt) => {
                setSearchInput(txt);
                setPage(1);
              }}
              placeholder="Buscar whisky, cerveza, cigarrillos, quesos..."
              placeholderTextColor="#94A3B8"
              returnKeyType="search"
              style={styles.searchInput}
            />
            {searchInput ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Limpiar búsqueda"
                onPress={() => {
                  setSearchInput('');
                  setPage(1);
                }}
                style={styles.clearSearchBtn}
              >
                <X size={16} color="#64748B" strokeWidth={2.2} />
              </Pressable>
            ) : null}
          </View>

          {/* Píldoras de confianza */}
          <View style={styles.trustRow}>
            <View style={styles.trustPill}>
              <Clock size={12} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.trustText}>Entrega ~30 min</Text>
            </View>
            <View style={styles.trustPill}>
              <ShieldCheck size={12} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.trustText}>Pago Online o Efectivo</Text>
            </View>
            <View style={styles.trustPill}>
              <Truck size={12} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.trustText}>Tracking GPS en Vivo</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Píldoras horizontales de Categorías */}
        <View style={styles.sectionBlock}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            <Pressable
              onPress={() => {
                setSelectedCategoryId('');
                setPage(1);
              }}
              style={[
                styles.catChip,
                {
                  backgroundColor:
                    selectedCategoryId === '' ? colors.primary : colors.surface,
                  borderColor:
                    selectedCategoryId === ''
                      ? colors.primary
                      : colors.borderStrong,
                },
              ]}
            >
              <Sparkles
                size={13}
                color={
                  selectedCategoryId === '' ? '#FFFFFF' : colors.textSecondary
                }
                strokeWidth={2.1}
              />
              <Text
                style={[
                  styles.catChipText,
                  {
                    color: selectedCategoryId === '' ? '#FFFFFF' : colors.text,
                  },
                ]}
              >
                Todos
              </Text>
            </Pressable>

            {categories.map((cat) => {
              const active = selectedCategoryId === cat._id;
              return (
                <Pressable
                  key={cat._id}
                  onPress={() => {
                    setSelectedCategoryId(active ? '' : cat._id);
                    setPage(1);
                  }}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active
                        ? colors.primary
                        : colors.borderStrong,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      { color: active ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Barra de Filtros: Disponibles + Ordenamiento */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersRow}
          >
            <Pressable
              onPress={() => {
                setOnlyAvailable((v) => !v);
                setPage(1);
              }}
              style={[
                styles.filterChip,
                {
                  backgroundColor: onlyAvailable
                    ? colors.successSoft
                    : colors.surface,
                  borderColor: onlyAvailable
                    ? colors.successBorder
                    : colors.border,
                },
              ]}
            >
              <CheckCircle2
                size={13}
                color={onlyAvailable ? colors.success : colors.textMuted}
                strokeWidth={2.2}
              />
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: onlyAvailable
                      ? colors.success
                      : colors.textSecondary,
                  },
                ]}
              >
                Solo disponibles
              </Text>
            </Pressable>

            {SORT_OPTIONS.map((opt) => {
              const active = sortKey === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    setSortKey(opt.key);
                    setPage(1);
                  }}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active
                        ? colors.primarySoft
                        : colors.surface,
                      borderColor: active
                        ? colors.primaryBorder
                        : colors.border,
                    },
                  ]}
                >
                  <ArrowUpDown
                    size={12}
                    color={active ? colors.primaryText : colors.textMuted}
                    strokeWidth={2.1}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color: active
                          ? colors.primaryText
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Encabezado de resultados */}
        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsTitle, { color: colors.text }]}>
            Catálogo Disponible
          </Text>
          <Text style={[styles.resultsCount, { color: colors.textMuted }]}>
            {meta.total} {meta.total === 1 ? 'producto' : 'productos'}
          </Text>
        </View>

        {/* Listado / Estados */}
        {isLoading ? (
          <View style={styles.cardsStack}>
            {[1, 2, 3].map((k) => (
              <View
                key={k}
                style={[
                  styles.skeletonCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Skeleton height={180} borderRadius={16} />
                <Skeleton width="65%" height={20} style={{ marginTop: 12 }} />
                <Skeleton width="90%" height={15} style={{ marginTop: 8 }} />
                <Skeleton width="40%" height={26} style={{ marginTop: 12 }} />
              </View>
            ))}
          </View>
        ) : isError ? (
          <EmptyState
            icon={Store}
            title="No pudimos cargar el catálogo"
            description="Verifica que el servidor NestJS esté encendido en tu computador y que ambos dispositivos estén en la misma red Wi-Fi."
            actionLabel="Reintentar conexión"
            onAction={() => void refetch()}
          />
        ) : products.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No encontramos productos"
            description="Prueba con otro término de búsqueda o limpia los filtros activos para explorar todo el catálogo."
            actionLabel="Limpiar filtros"
            onAction={resetFilters}
          />
        ) : (
          <View style={styles.cardsStack}>
            {products.map((prod) => (
              <ProductCard
                key={prod._id}
                product={prod}
                categoryName={resolveProductCategory(prod)}
                isAdding={
                  addMutation.isPending && addingProductId === prod._id
                }
                onAddToCart={(p) => handleAddToCart(p, 1)}
                onViewDetail={(p) => setSelectedProduct(p)}
              />
            ))}
          </View>
        )}

        {/* Paginación */}
        {meta.lastPage > 1 ? (
          <View style={styles.paginationRow}>
            <Button
              title="Anterior"
              size="sm"
              variant="outline"
              disabled={page <= 1}
              leftIcon={
                <ChevronLeft size={15} color={colors.text} strokeWidth={2.2} />
              }
              onPress={() => setPage((p) => Math.max(1, p - 1))}
            />

            <Text style={[styles.pageLabel, { color: colors.textSecondary }]}>
              Página {meta.page} de {meta.lastPage}
            </Text>

            <Button
              title="Siguiente"
              size="sm"
              variant="outline"
              disabled={page >= meta.lastPage}
              rightIcon={
                <ChevronRight size={15} color={colors.text} strokeWidth={2.2} />
              }
              onPress={() => setPage((p) => Math.min(meta.lastPage, p + 1))}
            />
          </View>
        ) : null}
      </ScrollView>

      {/* Modal de Detalle y Reseñas */}
      <ProductDetailModal
        product={selectedProduct}
        categoryName={
          selectedProduct ? resolveProductCategory(selectedProduct) : undefined
        }
        isAdding={
          Boolean(selectedProduct) &&
          addMutation.isPending &&
          addingProductId === selectedProduct?._id
        }
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(prod, qty) => {
          handleAddToCart(prod, qty);
          setSelectedProduct(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 28,
    gap: 14,
  },
  hero: {
    borderRadius: 24,
    padding: 18,
    gap: 11,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontFamily: FONTS.sansBold,
    fontSize: 11,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontFamily: FONTS.heading,
    fontSize: 22,
    lineHeight: 28,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.92)',
    fontFamily: FONTS.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  searchBox: {
    marginTop: 2,
    minHeight: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontFamily: FONTS.sansMedium,
    fontSize: 14,
    color: '#0F172A',
  },
  clearSearchBtn: {
    padding: 4,
  },
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.22)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  trustText: {
    color: '#FFFFFF',
    fontFamily: FONTS.sansSemi,
    fontSize: 11,
  },
  sectionBlock: {
    gap: 9,
  },
  categoriesScroll: {
    gap: 8,
    paddingRight: 8,
  },
  catChip: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  catChipText: {
    fontFamily: FONTS.sansSemi,
    fontSize: 13,
  },
  filtersRow: {
    gap: 8,
    paddingRight: 8,
  },
  filterChip: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  filterChipText: {
    fontFamily: FONTS.sansSemi,
    fontSize: 12,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  resultsTitle: {
    fontFamily: FONTS.heading,
    fontSize: 18,
  },
  resultsCount: {
    fontFamily: FONTS.sansSemi,
    fontSize: 12.5,
  },
  cardsStack: {
    gap: 14,
  },
  skeletonCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
  },
  paginationRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  pageLabel: {
    fontFamily: FONTS.sansSemi,
    fontSize: 13,
  },
});
