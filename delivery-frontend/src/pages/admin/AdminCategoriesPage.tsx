import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  createCategoryApi,
  deleteCategoryApi,
  getCategoriesApi,
  updateCategoryApi,
} from '@/api/endpoints/categories.api';
import { extractErrorMessage } from '@/api/axios.client';
import type { Category } from '@/types/catalog.types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

export function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategoriesApi({ limit: 50 }),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['categories'] });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
      };
      return editing
        ? updateCategoryApi(editing._id, payload)
        : createCategoryApi(payload);
    },
    onSuccess: () => {
      refresh();
      setIsOpen(false);
      toast.success(editing ? 'Categoría actualizada' : 'Categoría creada');
    },
    onError: (err) =>
      toast.error('No se pudo guardar', { description: extractErrorMessage(err) }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategoryApi(id),
    onSuccess: () => {
      refresh();
      toast.success('Categoría eliminada');
    },
    onError: (err) =>
      toast.error('No se pudo eliminar', { description: extractErrorMessage(err) }),
  });

  const open = (c: Category | null) => {
    setEditing(c);
    setName(c?.name ?? '');
    setDescription(c?.description ?? '');
    setIsOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-extrabold">Categorías</h2>
        <Button onClick={() => open(null)} leftIcon={<Plus className="w-4 h-4" />}>
          Nueva categoría
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data?.data ?? []).map((c) => (
            <div
              key={c._id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <h3 className="font-bold">{c.name}</h3>
                <p className="text-xs text-slate-500">
                  {c.description || 'Sin descripción'}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => open(c)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (window.confirm(`¿Eliminar "${c.name}"?`))
                      deleteMutation.mutate(c._id);
                  }}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editing ? 'Editar categoría' : 'Nueva categoría'}
        size="sm"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) {
              toast.warning('El nombre es obligatorio');
              return;
            }
            saveMutation.mutate();
          }}
        >
          <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex justify-end gap-2">
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
