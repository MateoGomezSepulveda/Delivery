import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react';
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
import { formatCurrency } from '@/utils/formatters';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { PaginationBar } from '@/components/catalog/PaginationBar';

const EMPTY: CreateProductPayload = {
  name: '',
  description: '',
  price: 0,
  available: true,
  image: '',
  categoryId: '',
};

export function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Product | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<CreateProductPayload>(EMPTY);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page],
    queryFn: () => getProductsApi({ page, limit: 10 }),
  });
  const { data: cats } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategoriesApi({ limit: 50 }),
  });

  const categories = cats?.data ?? [];
  const catName = (p: Product) => {
    const id = typeof p.categoryId === 'string' ? p.categoryId : p.categoryId?._id;
    return categories.find((c) => c._id === id)?.name ?? '—';
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: CreateProductPayload = {
        ...form,
        name: form.name.trim(),
        price: Number(form.price),
        image: form.image?.trim() || undefined,
        description: (form.description ?? '').trim(),
      };
      return editing
        ? updateProductApi(editing._id, payload)
        : createProductApi(payload);
    },
    onSuccess: () => {
      refresh();
      setIsOpen(false);
      toast.success(editing ? 'Producto actualizado' : 'Producto creado');
    },
    onError: (err) =>
      toast.error('No se pudo guardar', { description: extractErrorMessage(err) }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProductApi(id),
    onSuccess: () => {
      refresh();
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
      available: p.available,
      image: p.image ?? '',
      categoryId: typeof p.categoryId === 'string' ? p.categoryId : p.categoryId._id,
    });
    setPreviewUrl(p.image ?? '');
    setIsOpen(true);
  };

  const handleUpload = async (file?: File) => {
    if (!file) return;
    try {
      setUploading(true);
      const res = await uploadImageToS3Api(file, 'products');
      setForm((f) => ({ ...f, image: res.url }));
      setPreviewUrl(res.previewDataUrl || res.url);
      toast.success(
        res.url.startsWith('http')
          ? 'Imagen subida a S3'
          : 'Imagen optimizada localmente (respaldo sin S3 público)',
      );
    } catch (err) {
      toast.error('No se pudo subir la imagen', {
        description: extractErrorMessage(err),
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-extrabold">Productos</h2>
        <Button onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>
          Nuevo producto
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3">Producto</th>
              <th className="p-3">Categoría</th>
              <th className="p-3">Precio</th>
              <th className="p-3">Estado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  Cargando...
                </td>
              </tr>
            )}
            {(data?.data ?? []).map((p) => (
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
                        className="h-10 w-10 rounded-lg object-cover bg-slate-100"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800" />
                    )}
                    <span className="font-semibold">{p.name}</span>
                  </div>
                </td>
                <td className="p-3">{catName(p)}</td>
                <td className="p-3 font-semibold">{formatCurrency(p.price)}</td>
                <td className="p-3">
                  <Badge variant={p.available ? 'success' : 'neutral'}>
                    {p.available ? 'Disponible' : 'Agotado'}
                  </Badge>
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
            ))}
          </tbody>
        </table>
      </div>

      {data && <PaginationBar meta={data.meta} onPageChange={setPage} />}

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editing ? 'Editar producto' : 'Nuevo producto'}
        size="md"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim() || !form.categoryId) {
              toast.warning('Nombre y categoría son obligatorios');
              return;
            }
            saveMutation.mutate();
          }}
        >
          <Input
            label="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Descripción"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Precio"
              type="number"
              min={0}
              value={form.price}
              onChange={(e) =>
                setForm({ ...form, price: Number(e.target.value) })
              }
            />
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Categoría
              </label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm"
              >
                <option value="">Selecciona...</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {(previewUrl || form.image) && (
              <img
                src={previewUrl || form.image}
                alt="Vista previa"
                className="h-14 w-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700 bg-slate-100 shrink-0"
              />
            )}
            <div className="flex-1 space-y-1.5">
              <Input
                label="URL de imagen"
                value={form.image}
                onChange={(e) => {
                  setForm({ ...form, image: e.target.value });
                  setPreviewUrl(e.target.value);
                }}
              />
              <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer text-blue-600 dark:text-blue-400">
                <ImagePlus className="w-4 h-4" />
                {uploading ? 'Subiendo...' : 'Subir imagen a S3'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handleUpload(e.target.files?.[0])}
                />
              </label>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.available ?? true}
              onChange={(e) => setForm({ ...form, available: e.target.checked })}
            />
            Disponible para la venta
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={saveMutation.isPending}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
