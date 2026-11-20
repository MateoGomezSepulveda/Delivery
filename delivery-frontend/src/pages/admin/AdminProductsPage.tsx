import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ImagePlus,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import {
  createProductApi,
  deleteProductApi,
  getProductsApi,
  updateProductApi,
} from '@/api/endpoints/products.api';
import { getCategoriesApi } from '@/api/endpoints/categories.api';
import { uploadImageToS3Api } from '@/api/endpoints/uploads.api';
import { extractErrorMessage } from '@/api/axios.client';
import type { CreateProductPayload, Product } from '@/types/catalog.types';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency } from '@/utils/formatters';
import {
  calculateUnitProfit,
  DEFAULT_LOW_STOCK_THRESHOLD,
  getProductStockState,
} from '@/utils/inventory';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { PaginationBar } from '@/components/catalog/PaginationBar';

const EMPTY: CreateProductPayload = {
  name: '',
  description: '',
  price: 0,
  costPrice: 0,
  stock: 10,
  lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
  available: true,
  image: '',
  categoryId: '',
};

export function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  const [editing, setEditing] = useState<Product | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<CreateProductPayload>(EMPTY);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page, debouncedSearch, categoryFilter],
    queryFn: () =>
      getProductsApi({
        page,
        limit: 10,
        search: debouncedSearch.trim() || undefined,
        categoryId: categoryFilter || undefined,
      }),
  });
  const { data: cats } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategoriesApi({ limit: 50 }),
  });

  const categories = cats?.data ?? [];
  const catName = (p: Product) => {
    const id =
      typeof p.categoryId === 'object' && p.categoryId
        ? p.categoryId._id
        : p.categoryId;
    if (!id) return 'Sin categoría';
    return (
      (typeof p.categoryId === 'object' && p.categoryId?.name) ||
      categories.find((c) => c._id === id)?.name ||
      '—'
    );
  };

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
      queryClient.invalidateQueries({ queryKey: ['products'] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const trimmedImage = form.image?.trim();
      const stock = Math.max(0, Math.floor(Number(form.stock ?? 0)));
      const costPrice = Math.max(0, Number(form.costPrice ?? 0));
      const lowStockThreshold = Math.max(
        1,
        Math.floor(Number(form.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD)),
      );
      const payload: CreateProductPayload = {
        ...form,
        name: form.name.trim(),
        price: Math.max(0, Number(form.price)),
        costPrice,
        stock,
        lowStockThreshold,
        available: stock <= 0 ? false : (form.available ?? true),
        image: trimmedImage ? trimmedImage : null,
        description: (form.description ?? '').trim(),
      };
      return editing
        ? updateProductApi(editing._id, payload)
        : createProductApi(payload);
    },
    onSuccess: async () => {
      await Promise.all([
        refresh(),
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-top-products'] }),
      ]);
      setIsOpen(false);
      toast.success(editing ? 'Producto actualizado' : 'Producto creado');
    },
    onError: (err) =>
      toast.error('No se pudo guardar', { description: extractErrorMessage(err) }),
  });

  const toggleAvailableMutation = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) =>
      updateProductApi(id, { available }),
    onSuccess: async (_data, variables) => {
      await refresh();
      toast.success(
        variables.available
          ? 'Producto activado como disponible'
          : 'Producto marcado como agotado',
      );
    },
    onError: (err) =>
      toast.error('No se pudo cambiar la disponibilidad', {
        description: extractErrorMessage(err),
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProductApi(id),
    onSuccess: async () => {
      await refresh();
      toast.success('Producto eliminado');
    },
    onError: (err) =>
      toast.error('No se pudo eliminar', { description: extractErrorMessage(err) }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY, categoryId: categories[0]?._id ?? '' });
    setPreviewUrl('');
    setIsOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? '',
      price: p.price,
      costPrice: p.costPrice ?? 0,
      stock: p.stock ?? 0,
      lowStockThreshold: p.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
      available: p.available,
      image: p.image ?? '',
      categoryId:
        typeof p.categoryId === 'object' && p.categoryId
          ? p.categoryId._id
          : (p.categoryId ?? ''),
    });
    setPreviewUrl(p.image ?? '');
    setIsOpen(true);
  };

  const handleClearImage = () => {
    setForm((f) => ({ ...f, image: '' }));
    setPreviewUrl('');
  };

  const handleUpload = async (file?: File) => {
    if (!file) return;
    try {
      setUploading(true);
      const res = await uploadImageToS3Api(file, 'products');
      // Guardamos el DataURL optimizado (evita error 403 si el bucket S3 tiene acceso público bloqueado)
      const resolvedImage = res.previewDataUrl || res.url;
      setForm((f) => ({ ...f, image: resolvedImage }));
      setPreviewUrl(resolvedImage);
      toast.success('Imagen subida y procesada correctamente');
    } catch (err) {
      toast.error('No se pudo subir la imagen a S3', {
        description: extractErrorMessage(err),
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-extrabold">Productos</h2>
          <p className="text-xs text-slate-500">
            Administra el catálogo, imágenes en S3 y disponibilidad en tiempo real
          </p>
        </div>
        <Button onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>
          Nuevo producto
        </Button>
      </div>

      {/* Buscador con debounce y filtro por categoría */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8">
          <Input
            placeholder="Buscar producto por nombre o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="sm:col-span-4">
          <select
            aria-label="Filtrar por categoría"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3">Producto</th>
              <th className="p-3">Categoría</th>
              <th className="p-3">Venta / Costo</th>
              <th className="p-3">Ganancia Unit.</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Estado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  Cargando...
                </td>
              </tr>
            )}
            {!isLoading && (data?.data ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  No se encontraron productos con los filtros actuales.
                </td>
              </tr>
            )}
            {(data?.data ?? []).map((p) => {
              const stockState = getProductStockState(p);
              const cost = p.costPrice ?? 0;
              const { unitProfit, marginPercent } = calculateUnitProfit(
                p.price,
                cost,
              );

              return (
                <tr
                  key={p._id}
                  className="border-b last:border-0 border-slate-100 dark:border-slate-800"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=200&q=80';
                          }}
                          className="h-10 w-10 rounded-lg object-cover bg-slate-100 shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <span className="font-semibold block truncate max-w-[220px]">
                          {p.name}
                        </span>
                        {p.description && (
                          <span className="text-xs text-slate-400 line-clamp-1 max-w-[220px]">
                            {p.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    {catName(p)}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="font-semibold block text-slate-900 dark:text-white">
                      {formatCurrency(p.price)}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Compra: {formatCurrency(cost)}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span
                      className={`font-bold block ${
                        unitProfit < 0
                          ? 'text-red-600 dark:text-red-400'
                          : unitProfit === 0
                            ? 'text-slate-500'
                            : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {unitProfit >= 0 ? '+' : ''}
                      {formatCurrency(unitProfit)}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Margen {marginPercent}%
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {stockState.stock === 0 ? (
                      <Badge
                        variant="danger"
                        icon={<AlertTriangle className="w-3 h-3" />}
                      >
                        0 uds
                      </Badge>
                    ) : stockState.isLowStock ? (
                      <Badge
                        variant="warning"
                        icon={<AlertTriangle className="w-3 h-3" />}
                      >
                        {stockState.stock} uds (bajo)
                      </Badge>
                    ) : (
                      <Badge
                        variant="neutral"
                        icon={<Package className="w-3 h-3" />}
                      >
                        {stockState.stock ?? 0} uds
                      </Badge>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!stockState.isOutOfStock}
                        aria-label={`Cambiar disponibilidad de ${p.name}`}
                        disabled={toggleAvailableMutation.isPending}
                        onClick={() => {
                          if (!p.available && (p.stock ?? 0) <= 0) {
                            toast.warning(
                              'Agrega unidades al stock antes de activar este producto',
                            );
                            openEdit(p);
                            return;
                          }
                          toggleAvailableMutation.mutate({
                            id: p._id,
                            available: !p.available,
                          });
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                          !stockState.isOutOfStock
                            ? 'bg-emerald-500'
                            : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                            !stockState.isOutOfStock
                              ? 'translate-x-5'
                              : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <Badge
                        variant={!stockState.isOutOfStock ? 'success' : 'neutral'}
                      >
                        {!stockState.isOutOfStock ? 'Disponible' : 'Agotado'}
                      </Badge>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Editar"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Eliminar"
                        onClick={() => {
                          if (window.confirm(`¿Eliminar "${p.name}"?`))
                            deleteMutation.mutate(p._id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data && <PaginationBar meta={data.meta} onPageChange={setPage} />}

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editing ? 'Editar producto' : 'Nuevo producto'}
        size="lg"
      >
        <form
          className="space-y-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (uploading) return;
            if (!form.name.trim() || !form.categoryId) {
              toast.warning('Nombre y categoría son obligatorios');
              return;
            }
            saveMutation.mutate();
          }}
        >
          {/* Barra compacta de Fotografía del Producto */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-2.5 flex items-center gap-3">
            <div className="h-14 w-14 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0 flex items-center justify-center">
              {previewUrl || form.image ? (
                <img
                  src={previewUrl || form.image || ''}
                  alt="Vista previa"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=200&q=80';
                  }}
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImagePlus className="w-5 h-5 text-orange-500/70" />
              )}
            </div>

            <div className="flex-1 flex flex-wrap items-center gap-2">
              <label
                className={`inline-flex items-center gap-1.5 rounded-xl border border-orange-200 dark:border-orange-900/60 bg-orange-50 dark:bg-orange-950/40 px-3 py-2 text-xs font-bold text-orange-700 dark:text-orange-300 hover:bg-orange-100/80 transition-colors shrink-0 ${
                  uploading
                    ? 'opacity-50 pointer-events-none'
                    : 'cursor-pointer'
                }`}
              >
                <ImagePlus className="w-3.5 h-3.5 text-orange-600" />
                <span>
                  {uploading
                    ? 'Subiendo...'
                    : previewUrl || form.image
                      ? 'Cambiar foto'
                      : 'Subir foto'}
                </span>
                <input
                  type="file"
                  accept="image/*,.jfif,.jpeg,.jpg,.png,.webp,.avif"
                  disabled={uploading}
                  className="hidden"
                  onChange={(e) => {
                    void handleUpload(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </label>

              {(previewUrl || form.image) && (
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="inline-flex items-center gap-1 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/30 px-2.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100/70 transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Quitar</span>
                </button>
              )}

              <input
                type="text"
                placeholder={
                  form.image?.startsWith('data:image/')
                    ? 'Foto cargada (o pega URL https://...)'
                    : 'O pega URL de imagen (https://...)'
                }
                value={
                  form.image?.startsWith('data:image/')
                    ? ''
                    : (form.image ?? '')
                }
                onChange={(e) => {
                  setForm({ ...form, image: e.target.value });
                  setPreviewUrl(e.target.value);
                }}
                className="flex-1 min-w-[180px] h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nombre del producto"
              placeholder="Ej. Whisky Buchanan's Deluxe 12 Años 750ml"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <div className="w-full space-y-1.5">
              <label
                htmlFor="product-category"
                className="block text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                Categoría
              </label>
              <select
                id="product-category"
                value={form.categoryId}
                onChange={(e) =>
                  setForm({ ...form, categoryId: e.target.value })
                }
                className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              >
                <option value="">Selecciona una categoría...</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Precio venta (COP)"
              type="number"
              min={0}
              value={form.price}
              onChange={(e) =>
                setForm({ ...form, price: Number(e.target.value) })
              }
            />
            <Input
              label="Precio compra / Costo (COP)"
              type="number"
              min={0}
              value={form.costPrice ?? 0}
              onChange={(e) =>
                setForm({ ...form, costPrice: Number(e.target.value) })
              }
            />
            <Input
              label="Stock disponible (uds)"
              type="number"
              min={0}
              step={1}
              value={form.stock ?? 0}
              onChange={(e) => {
                const nextStock = Math.max(0, Math.floor(Number(e.target.value)));
                setForm({
                  ...form,
                  stock: nextStock,
                  available: nextStock <= 0 ? false : form.available,
                });
              }}
            />
          </div>

          {/* Previsualización en vivo de Rentabilidad e Inventario */}
          {(() => {
            const { unitProfit, marginPercent } = calculateUnitProfit(
              Number(form.price || 0),
              Number(form.costPrice || 0),
            );
            const currentStock = Math.max(0, Math.floor(Number(form.stock ?? 0)));
            const stockPotentialProfit = unitProfit * currentStock;
            const isNegative = unitProfit < 0;

            return (
              <div
                className={`rounded-xl border px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs ${
                  isNegative
                    ? 'border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 text-red-800 dark:text-red-200'
                    : currentStock === 0
                      ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200'
                      : 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/25 text-emerald-900 dark:text-emerald-200'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {isNegative || currentStock === 0 ? (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  ) : (
                    <TrendingUp className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  )}
                  <span>
                    {isNegative
                      ? 'El costo de compra supera el precio de venta'
                      : currentStock === 0
                        ? 'Stock en 0: se marcará automáticamente como Agotado'
                        : `Ganancia real/ud: ${formatCurrency(unitProfit)} (${marginPercent}% margen)`}
                  </span>
                </div>
                {!isNegative && currentStock > 0 && (
                  <span className="font-bold">
                    Ganancia potencial stock: {formatCurrency(stockPotentialProfit)}
                  </span>
                )}
              </div>
            );
          })()}

          <div className="w-full space-y-1.5">
            <label
              htmlFor="product-description"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Descripción
            </label>
            <textarea
              id="product-description"
              rows={2}
              placeholder="Describe el producto..."
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 resize-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  role="switch"
                  aria-checked={(form.stock ?? 0) > 0 && (form.available ?? true)}
                  disabled={(form.stock ?? 0) <= 0}
                  onClick={() =>
                    setForm({ ...form, available: !(form.available ?? true) })
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                    (form.stock ?? 0) > 0 && (form.available ?? true)
                      ? 'bg-emerald-500'
                      : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                      (form.stock ?? 0) > 0 && (form.available ?? true)
                        ? 'translate-x-5'
                        : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Disponible para la venta
                </span>
              </div>

              <label className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span>Avisar stock bajo ≤</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  aria-label="Umbral de alerta por pocas unidades"
                  value={form.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      lowStockThreshold: Math.max(
                        1,
                        Math.floor(Number(e.target.value) || 1),
                      ),
                    })
                  }
                  className="w-14 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs font-bold text-center text-slate-900 dark:text-slate-100"
                />
                <span>uds</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={saveMutation.isPending}
                disabled={uploading}
              >
                {uploading ? 'Subiendo...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
