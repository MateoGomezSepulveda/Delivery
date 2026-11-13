import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Compass,
  Home,
  MapPin,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  createAddressApi,
  deleteAddressApi,
  getMyAddressesApi,
  updateAddressApi,
} from '@/api/endpoints/addresses.api';
import { extractErrorMessage } from '@/api/axios.client';
import type { Address, CreateAddressPayload } from '@/types/order.types';
import { useCartDrawerStore } from '@/store/useCartDrawerStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/utils/cn';

export function AddressesModal() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const {
    isAddressModalOpen,
    closeAddressModal,
    selectedAddress,
    setSelectedAddress,
  } = useCartDrawerStore();

  const [isCreating, setIsCreating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 4.6768,
    lng: -74.0482, // Bogotá por defecto
  });
  const [isLocatingGps, setIsLocatingGps] = useState(false);

  const [form, setForm] = useState<CreateAddressPayload>({
    title: 'Casa',
    street: '',
    city: 'Bogotá',
    state: 'Cundinamarca',
    zipCode: '110221',
    country: 'Colombia',
    isDefault: true,
    phone: '',
    deliveryInstructions: '',
  });

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['my-addresses'],
    queryFn: getMyAddressesApi,
    enabled: isAuthenticated && isAddressModalOpen,
  });

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddress) {
      const defaultAddr =
        addresses.find((a) => a.isDefault) ?? addresses[0];
      setSelectedAddress(defaultAddr);
    }
  }, [addresses, selectedAddress, setSelectedAddress]);

  const createMutation = useMutation({
    mutationFn: createAddressApi,
    onSuccess: (created) => {
      toast.success('Dirección guardada exitosamente');
      setSelectedAddress(created);
      setIsCreating(false);
      setForm({
        title: 'Casa',
        street: '',
        city: 'Bogotá',
        state: 'Cundinamarca',
        zipCode: '110221',
        country: 'Colombia',
        isDefault: false,
        phone: '',
        deliveryInstructions: '',
      });
      queryClient.invalidateQueries({ queryKey: ['my-addresses'] });
    },
    onError: (err) => {
      toast.error('Error al crear dirección', {
        description: extractErrorMessage(err),
      });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (addr: Address) =>
      updateAddressApi(addr._id, { isDefault: true }),
    onSuccess: (updated) => {
      setSelectedAddress(updated);
      toast.success(`"${updated.title}" seleccionada como predeterminada`);
      queryClient.invalidateQueries({ queryKey: ['my-addresses'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAddressApi,
    onSuccess: (_, deletedId) => {
      toast.success('Dirección eliminada');
      if (selectedAddress?._id === deletedId) {
        setSelectedAddress(null);
      }
      queryClient.invalidateQueries({ queryKey: ['my-addresses'] });
    },
    onError: (err) => {
      toast.error('No se pudo eliminar la dirección', {
        description: extractErrorMessage(err),
      });
    },
  });

  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización GPS.');
      return;
    }

    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        setCoords({ lat, lng });

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
          );
          const geo = await res.json();
          const road =
            geo?.address?.road ||
            geo?.display_name?.split(',').slice(0, 2).join(',') ||
            `Coord GPS (${lat}, ${lng})`;
          const city =
            geo?.address?.city ||
            geo?.address?.town ||
            geo?.address?.state ||
            'Bogotá';

          setForm((prev) => ({
            ...prev,
            street: road,
            city,
            state: geo?.address?.state || prev.state,
            zipCode: geo?.address?.postcode || prev.zipCode,
            country: geo?.address?.country || prev.country,
          }));
          toast.success('Ubicación GPS detectada en el mapa');
        } catch {
          setForm((prev) => ({
            ...prev,
            street: `Ubicación GPS (${lat}, ${lng})`,
          }));
        } finally {
          setIsLocatingGps(false);
        }
      },
      () => {
        setIsLocatingGps(false);
        toast.error(
          'No se pudo obtener tu GPS. Verifica los permisos de ubicación del navegador.',
        );
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.street.trim() || !form.city.trim()) {
      toast.error('Completa la etiqueta, calle/dirección y ciudad.');
      return;
    }
    createMutation.mutate({
      ...form,
      title: form.title.trim(),
      street: form.street.trim(),
      city: form.city.trim(),
    });
  };

  const mapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${
    coords.lng - 0.008
  }%2C${coords.lat - 0.005}%2C${coords.lng + 0.008}%2C${
    coords.lat + 0.005
  }&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`;

  return (
    <Modal
      isOpen={isAddressModalOpen}
      onClose={closeAddressModal}
      title="Mis Direcciones de Entrega"
      description="Selecciona dónde quieres recibir tu pedido o agrega una nueva ubicación con mapa."
      size="lg"
      footer={
        <div className="w-full flex items-center justify-between">
          {!isCreating ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCreating(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Nueva Dirección
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCreating(false)}
            >
              ← Volver a mis direcciones
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={closeAddressModal}>
            Listo
          </Button>
        </div>
      }
    >
      {!isAuthenticated ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-5 text-center space-y-2">
          <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
            Inicia sesión para gestionar tu libreta de direcciones
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Las direcciones se guardan de forma segura en tu cuenta (GET/POST
            /api/v1/addresses).
          </p>
        </div>
      ) : isCreating ? (
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {/* Interactive Map Preview + GPS Button */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-orange-600" />
                <span>Mapa Interactivo (OpenStreetMap)</span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                isLoading={isLocatingGps}
                onClick={handleUseCurrentGps}
                leftIcon={<Compass className="w-3.5 h-3.5 text-blue-600" />}
              >
                Usar mi ubicación GPS actual
              </Button>
            </div>
            <div className="h-44 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100">
              <iframe
                title="Mapa de ubicación de entrega"
                src={mapEmbedUrl}
                className="w-full h-full border-0"
                loading="lazy"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Etiqueta (Casa, Oficina...)"
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              leftIcon={<Home className="w-4 h-4" />}
            />
            <div className="sm:col-span-2">
              <Input
                label="Dirección / Calle y Número"
                placeholder="Ej. Calle 85 # 15-32 Apto 402"
                value={form.street}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, street: e.target.value }))
                }
                leftIcon={<MapPin className="w-4 h-4" />}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input
              label="Ciudad"
              value={form.city}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, city: e.target.value }))
              }
            />
            <Input
              label="Departamento/Estado"
              value={form.state}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, state: e.target.value }))
              }
            />
            <Input
              label="Código Postal"
              value={form.zipCode}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, zipCode: e.target.value }))
              }
            />
            <Input
              label="País"
              value={form.country}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, country: e.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Teléfono de Contacto (Opcional)"
              placeholder="+57 300 123 4567"
              value={form.phone || ''}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, phone: e.target.value }))
              }
            />
            <Input
              label="Instrucciones de Entrega (Opcional)"
              placeholder="Ej. Dejar en portería / Timbre 402"
              value={form.deliveryInstructions || ''}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  deliveryInstructions: e.target.value,
                }))
              }
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              isLoading={createMutation.isPending}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Guardar Dirección en mi Cuenta
            </Button>
          </div>
        </form>
      ) : isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : addresses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
          <MapPin className="w-8 h-8 text-orange-600 mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              Aún no tienes direcciones guardadas
            </p>
            <p className="text-xs text-slate-500">
              Agrega tu primera dirección de entrega para recibir tus pedidos.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreating(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Agregar mi Primera Dirección
          </Button>
        </div>
      ) : (
        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          {addresses.map((addr) => {
            const isSelected = selectedAddress?._id === addr._id;
            return (
              <div
                key={addr._id}
                onClick={() => {
                  setSelectedAddress(addr);
                  setDefaultMutation.mutate(addr);
                }}
                className={cn(
                  'rounded-2xl border p-4 flex items-start justify-between gap-4 transition-colors cursor-pointer',
                  isSelected
                    ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-950/30 dark:border-orange-500/80'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-orange-300',
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-950 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {addr.title}
                      </span>
                      {(addr.isDefault || isSelected) && (
                        <Badge variant="primary">Activa</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {addr.street}, {addr.city} ({addr.state})
                    </p>
                    {addr.deliveryInstructions && (
                      <p className="text-[11px] text-slate-400">
                        Nota: {addr.deliveryInstructions}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(addr._id);
                  }}
                  title="Eliminar dirección"
                  className="p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
