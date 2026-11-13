import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  createCouponApi,
  deleteCouponApi,
  getCouponsApi,
  updateCouponApi,
} from '@/api/endpoints/coupons.api';
import { extractErrorMessage } from '@/api/axios.client';
import type { Coupon, DiscountType } from '@/types/order.types';
import { formatCurrency } from '@/utils/formatters';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

interface CouponForm {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number;
  expirationDate: string;
  usageLimit: number;
  isActive: boolean;
}

const EMPTY: CouponForm = {
  code: '',
  discountType: 'PERCENTAGE',
  discountValue: 10,
  minOrderAmount: 0,
  maxDiscountAmount: 0,
  expirationDate: '',
  usageLimit: 100,
  isActive: true,
};

export function AdminCouponsPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponForm>(EMPTY);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: getCouponsApi,
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minOrderAmount: Number(form.minOrderAmount) || 0,
        maxDiscountAmount: Number(form.maxDiscountAmount) || undefined,
        expirationDate: new Date(`${form.expirationDate}T23:59:59`).toISOString(),
        usageLimit: Number(form.usageLimit) || undefined,
        isActive: form.isActive,
      };
      return editing
        ? updateCouponApi(editing._id, payload)
        : createCouponApi(payload);
    },
    onSuccess: () => {
      refresh();
      setIsOpen(false);
      toast.success(editing ? 'Cupón actualizado' : 'Cupón creado');
    },
    onError: (err) =>
      toast.error('No se pudo guardar el cupón', {
        description: extractErrorMessage(err),
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCouponApi(id),
    onSuccess: () => {
      refresh();
      toast.success('Cupón eliminado');
    },
    onError: (err) =>
      toast.error('No se pudo eliminar', { description: extractErrorMessage(err) }),
  });

  const open = (c: Coupon | null) => {
    setEditing(c);
    setForm(
      c
        ? {
            code: c.code,
            discountType: c.discountType,
            discountValue: c.discountValue,
            minOrderAmount: c.minOrderAmount ?? 0,
            maxDiscountAmount: c.maxDiscountAmount ?? 0,
            expirationDate: c.expirationDate.slice(0, 10),
            usageLimit: c.usageLimit ?? 0,
            isActive: c.isActive,
          }
        : EMPTY,
    );
    setIsOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-extrabold">Cupones y promos</h2>
        <Button onClick={() => open(null)} leftIcon={<Plus className="w-4 h-4" />}>
          Nuevo cupón
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3">Código</th>
              <th className="p-3">Descuento</th>
              <th className="p-3">Mínimo</th>
              <th className="p-3">Usos</th>
              <th className="p-3">Vence</th>
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
            {coupons.map((c) => (
              <tr
                key={c._id}
                className="border-b last:border-0 border-slate-100 dark:border-slate-800"
              >
                <td className="p-3 font-mono font-bold">{c.code}</td>
                <td className="p-3">
                  {c.discountType === 'PERCENTAGE'
                    ? `${c.discountValue}%`
                    : formatCurrency(c.discountValue)}
                </td>
                <td className="p-3">{formatCurrency(c.minOrderAmount ?? 0)}</td>
                <td className="p-3">
                  {c.usedCount}/{c.usageLimit ?? '∞'}
                </td>
                <td className="p-3">{c.expirationDate.slice(0, 10)}</td>
                <td className="p-3">
                  <Badge variant={c.isActive ? 'success' : 'neutral'}>
                    {c.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => open(c)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar ${c.code}?`))
                          deleteMutation.mutate(c._id);
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

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editing ? 'Editar cupón' : 'Nuevo cupón'}
        size="md"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.code.trim() || !form.expirationDate) {
              toast.warning('Código y fecha de expiración son obligatorios');
              return;
            }
            saveMutation.mutate();
          }}
        >
          <Input
            label="Código"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Tipo
              </label>
              <select
                value={form.discountType}
                onChange={(e) =>
                  setForm({ ...form, discountType: e.target.value as DiscountType })
                }
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm"
              >
                <option value="PERCENTAGE">Porcentaje</option>
                <option value="FIXED">Monto fijo</option>
              </select>
            </div>
            <Input
              label="Valor"
              type="number"
              min={0}
              value={form.discountValue}
              onChange={(e) =>
                setForm({ ...form, discountValue: Number(e.target.value) })
              }
            />
            <Input
              label="Compra mínima"
              type="number"
              min={0}
              value={form.minOrderAmount}
              onChange={(e) =>
                setForm({ ...form, minOrderAmount: Number(e.target.value) })
              }
            />
            <Input
              label="Tope de descuento"
              type="number"
              min={0}
              value={form.maxDiscountAmount}
              onChange={(e) =>
                setForm({ ...form, maxDiscountAmount: Number(e.target.value) })
              }
            />
            <Input
              label="Vence"
              type="date"
              value={form.expirationDate}
              onChange={(e) => setForm({ ...form, expirationDate: e.target.value })}
            />
            <Input
              label="Límite de usos"
              type="number"
              min={0}
              value={form.usageLimit}
              onChange={(e) =>
                setForm({ ...form, usageLimit: Number(e.target.value) })
              }
            />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Cupón activo
          </label>
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
