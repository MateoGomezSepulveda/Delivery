import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Flame,
  Layers,
  Sparkles,
  Store,
  UtensilsCrossed,
} from 'lucide-react';
import { getCategoriesApi } from '@/api/endpoints/categories.api';
import {
  getProductsApi,
  seedDemoCatalogApi,
} from '@/api/endpoints/products.api';
import { useCartMutations } from '@/hooks/useCartMutations';
import { extractErrorMessage } from '@/api/axios.client';
import type {
  Product,
  ProductSortBy,
  SortOrder,
} from '@/types/catalog.types';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartDrawerStore } from '@/store/useCartDrawerStore';
import { CategoryPills } from '@/components/catalog/CategoryPills';
import { ProductFiltersBar } from '@/components/catalog/ProductFiltersBar';
import { ProductCard } from '@/components/catalog/ProductCard';
import { PaginationBar } from '@/components/catalog/PaginationBar';
import { ProductDetailModal } from '@/components/catalog/ProductDetailModal';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const { openDrawer } = useCartDrawerStore();

  // Estados locales sincronizados con URL query params
  const [searchInput, setSearchInput] = useState(
    searchParams.get('search') || '',
  );
  const debouncedSearch = useDebounce(searchInput, 350);

  const selectedCategoryId = searchParams.get('categoryId') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const onlyAvailable = searchParams.get('available') === 'true';
  const sortBy =
    (searchParams.get('sortBy') as ProductSortBy) || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') as SortOrder) || 'desc';
  const page = Number(searchParams.get('page') || '1');

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Sincronizar debouncedSearch en la URL
  useEffect(() => {
    const currentUrlSearch = searchParams.get('search') || '';
    if (debouncedSearch !== currentUrlSearch) {
      const next = new URLSearchParams(searchParams);
      if (debouncedSearch.trim()) {
        next.set('search', debouncedSearch.trim());
      } else {
        next.delete('search');
      }
      next.set('page', '1');
      setSearchParams(next, { replace: true });
    }
  }, [debouncedSearch, searchParams, setSearchParams]);

  const updateQueryParam = (
    updates: Record<string, string | undefined>,
    resetPage = true,
  ) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v && v !== '') {
        next.set(k, v);
      } else {
        next.delete(k);
      }
    });
    if (resetPage) {
      next.set('page', '1');
    }
    setSearchParams(next);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters = Boolean(
    searchInput.trim() ||
      selectedCategoryId ||
      minPrice ||
      maxPrice ||
      onlyAvailable ||
      sortBy !== 'createdAt' ||
      sortOrder !== 'desc',
  );

  // 1. Consulta de Categorías (cacheadas 1h en Redis del Backend)
  const { data: categoriesResponse, isLoading: isLoadingCategories } = useQuery(
    {
      queryKey: ['categories'],
      queryFn: () => getCategoriesApi({ limit: 50 }),
      retry: 1,
    },
  );

  const categories = useMemo(
    () => categoriesResponse?.data ?? [],
    [categoriesResponse],
  );

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c._id, c.name));
    return map;
  }, [categories]);

  // 2. Consulta Paginada de Productos (cacheada 10min en Redis del Backend)
  const productQueryFilters = useMemo(
    () => ({
      page,
      limit: 8,
      search: debouncedSearch.trim() || undefined,
      categoryId: selectedCategoryId || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      available: onlyAvailable ? true : undefined,
      sortBy,
      sortOrder,
    }),
    [
      page,
      debouncedSearch,
      selectedCategoryId,
      minPrice,
      maxPrice,
      onlyAvailable,
      sortBy,
      sortOrder,
    ],
  );

  const {
    data: productsResponse,
    isLoading: isLoadingProducts,
    isFetching: isFetchingProducts,
    isError: isProductsError,
    error: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['products', productQueryFilters],
    queryFn: () => getProductsApi(productQueryFilters),
    retry: 1,
  });

  const products = productsResponse?.data ?? [];
  const paginationMeta = productsResponse?.meta ?? {
    total: 0,
    page: 1,
    lastPage: 1,
  };

  // Mutación para sembrar catálogo demo si la base de datos está vacía
  const seedMutation = useMutation({
    mutationFn: seedDemoCatalogApi,
    onSuccess: () => {
      toast.success('¡Catálogo Gourmet sembrado en MongoDB!', {
        description:
          'Se crearon 4 categorías y 8 platos reales en tu base de datos.',
      });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err) => {
      toast.error('No se pudo sembrar el catálogo demo', {
        description: extractErrorMessage(err),
      });
    },
  });

  const { addMutation: addToCartMutation } = useCartMutations({
    onAddSuccess: (_updatedCart, variables) => {
      toast.success('¡Producto agregado a tu carrito!', {
        description: `Se agregaron ${variables.quantity} unidad(es) correctamente.`,
      });
      openDrawer();
    },
  });

  const handleAddToCart = (product: Product, quantity = 1) => {
    if (!isAuthenticated) {
      toast.info('Inicia sesión para agregar productos a tu carrito');
      navigate('/login');
      return;
    }
    addToCartMutation.mutate({ productId: product._id, quantity, product });
  };

  return (
    <div className="space-y-8">
      {/* Appetizing Hero Marketplace Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-orange-200/70 dark:border-orange-900/40 bg-gradient-to-r from-orange-600 via-orange-500 to-red-600 p-6 sm:p-10 text-white shadow-warm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1 text-xs font-semibold">
              <Flame className="w-3.5 h-3.5" />
              <span>Catálogo en Tiempo Real · Redis Cache + Índices MongoDB</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Sabores extraordinarios, entregados calientes en tu puerta.
            </h1>
            <p className="text-orange-50 text-sm sm:text-base leading-relaxed">
              Explora nuestras categorías, filtra por rango de precios, ordena
              dinámicamente y consulta las reseñas verificadas de cada plato.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {user?.role === 'ADMIN' && (
              <Button
                variant="outline"
                isLoading={seedMutation.isPending}
                onClick={() => seedMutation.mutate()}
                leftIcon={<Sparkles className="w-4 h-4" />}
                className="border-white/30 bg-white text-orange-700 hover:bg-orange-50 dark:bg-slate-900 dark:text-white"
              >
                Sembrar Platos Demo (Admin)
              </Button>
            )}
            <Link to="/ui-lab">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Layers className="w-4 h-4" />}
                className="border-white/35 bg-white/10 text-white hover:bg-white/20"
              >
                Ver UI Lab (Fase 0)
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Horizontal Pill Bar */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-orange-600" />
            <span>Categorías Gastronómicas</span>
          </h2>
          {isFetchingProducts && (
            <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 animate-pulse">
              Actualizando resultados...
            </span>
          )}
        </div>

        <CategoryPills
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={(categoryId) =>
            updateQueryParam({ categoryId: categoryId || undefined })
          }
          isLoading={isLoadingCategories}
        />
      </section>

      {/* Search, Price Filter & Dynamic Sort Bar */}
      <ProductFiltersBar
        search={searchInput}
        onSearchChange={setSearchInput}
        minPrice={minPrice}
        onMinPriceChange={(val) =>
          updateQueryParam({ minPrice: val || undefined })
        }
        maxPrice={maxPrice}
        onMaxPriceChange={(val) =>
          updateQueryParam({ maxPrice: val || undefined })
        }
        onlyAvailable={onlyAvailable}
        onOnlyAvailableChange={(val) =>
          updateQueryParam({ available: val ? 'true' : undefined })
        }
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(nextSortBy, nextSortOrder) =>
          updateQueryParam({ sortBy: nextSortBy, sortOrder: nextSortOrder })
        }
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Products Grid */}
      <section className="space-y-6">
        {isLoadingProducts ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <ProductCardSkeleton key={idx} />
            ))}
          </div>
        ) : isProductsError ? (
          <EmptyState
            icon={<UtensilsCrossed className="w-7 h-7" />}
            title="No pudimos conectar con el catálogo del servidor"
            description={`Detalle técnico: ${extractErrorMessage(productsError)}. Asegúrate de que los contenedores de Docker (api, mongo y redis) estén activos.`}
            action={
              <Button variant="primary" onClick={() => refetchProducts()}>
                Reintentar Carga del Catálogo
              </Button>
            }
          />
        ) : products.length === 0 ? (
          <EmptyState
            icon={<UtensilsCrossed className="w-7 h-7" />}
            title={
              hasActiveFilters
                ? 'No encontramos platos con esos filtros'
                : 'Aún no hay productos cargados en el catálogo'
            }
            description={
              hasActiveFilters
                ? 'Intenta ampliar el rango de precios, cambiar la categoría o limpiar la búsqueda.'
                : user?.role === 'ADMIN'
                  ? 'Haz clic en el botón de abajo para poblar automáticamente tu base de datos MongoDB con 4 categorías y 8 platos gourmet de prueba.'
                  : 'Inicia sesión con tu cuenta Administrador (admin@delivery.com) para sembrar el catálogo inicial con 1 clic.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="primary" onClick={handleResetFilters}>
                  Mostrar Todo el Menú
                </Button>
              ) : user?.role === 'ADMIN' ? (
                <Button
                  variant="primary"
                  isLoading={seedMutation.isPending}
                  onClick={() => seedMutation.mutate()}
                  leftIcon={<Sparkles className="w-4 h-4" />}
                >
                  Sembrar Catálogo Gourmet en MongoDB
                </Button>
              ) : (
                <Link to="/login">
                  <Button variant="primary">
                    Iniciar Sesión como Admin para Poblar Catálogo
                  </Button>
                </Link>
              )
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => {
                const catId =
                  typeof product.categoryId === 'string'
                    ? product.categoryId
                    : product.categoryId?._id;
                return (
                  <ProductCard
                    key={product._id}
                    product={product}
                    categoryName={
                      catId ? categoryNameById.get(catId) : undefined
                    }
                    onSelectProduct={setSelectedProduct}
                    onAddToCart={(p) => handleAddToCart(p, 1)}
                  />
                );
              })}
            </div>

            <PaginationBar
              meta={paginationMeta}
              onPageChange={(nextPage) =>
                updateQueryParam({ page: String(nextPage) }, false)
              }
            />
          </>
        )}
      </section>

      {/* Product Detail & Public Reviews Modal */}
      <ProductDetailModal
        product={selectedProduct}
        categoryName={
          selectedProduct
            ? categoryNameById.get(
                typeof selectedProduct.categoryId === 'string'
                  ? selectedProduct.categoryId
                  : selectedProduct.categoryId?._id,
              )
            : undefined
        }
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
}
