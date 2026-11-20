import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Bike,
  Car,
  CheckCircle2,
  Clock,
  Mail,
  MailCheck,
  Phone,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  changeUserRoleApi,
  deleteUserApi,
  getAllUsersApi,
} from '@/api/endpoints/users.api';
import {
  getDeliveryProfilesAdminApi,
  reviewDeliveryProfileAdminApi,
} from '@/api/endpoints/delivery.api';
import { extractErrorMessage } from '@/api/axios.client';
import type { UserRole } from '@/types/api.types';
import type { User } from '@/types/auth.types';
import type {
  DeliveryProfile,
  DeliveryProfileUserPopulated,
  VehicleType,
} from '@/types/delivery.types';
import { useAuthStore } from '@/store/useAuthStore';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, RoleBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { PaginationBar } from '@/components/catalog/PaginationBar';
import { formatDateTime } from '@/utils/formatters';
import { cn } from '@/utils/cn';

const ROLES: UserRole[] = ['CLIENT', 'DELIVERY', 'ADMIN'];
type UserTab = 'ALL' | 'PENDING_RIDERS' | UserRole;

const VEHICLE_LABELS: Record<VehicleType, string> = {
  MOTO: 'Motocicleta',
  CAR: 'Automóvil',
  BICYCLE: 'Bicicleta',
};

function getPopulatedApplicant(
  profile: DeliveryProfile,
): DeliveryProfileUserPopulated | null {
  return typeof profile.userId === 'object' && profile.userId !== null
    ? profile.userId
    : null;
}

function getProfileUserId(profile: DeliveryProfile): string {
  return typeof profile.userId === 'string'
    ? profile.userId
    : profile.userId._id;
}

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const avatarsByUserId = useAuthStore((s) => s.avatarsByUserId);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<UserTab>('ALL');
  const [selectedUserProfile, setSelectedUserProfile] = useState<User | null>(
    null,
  );
  const [rejectingProfile, setRejectingProfile] =
    useState<DeliveryProfile | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeTab]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, debouncedSearch],
    queryFn: () =>
      getAllUsersApi({
        page,
        limit: 10,
        search: debouncedSearch.trim() || undefined,
      }),
  });

  const {
    data: deliveryProfiles = [],
    isLoading: isLoadingProfiles,
  } = useQuery({
    queryKey: ['admin-delivery-profiles'],
    queryFn: () => getDeliveryProfilesAdminApi(),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    queryClient.invalidateQueries({ queryKey: ['admin-delivery-profiles'] });
  };

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      changeUserRoleApi(id, role),
    onSuccess: () => {
      refresh();
      toast.success('Rol actualizado');
    },
    onError: (err) =>
      toast.error('No se pudo cambiar el rol', {
        description: extractErrorMessage(err),
      }),
  });

  const reviewProfileMutation = useMutation({
    mutationFn: ({
      profileId,
      status,
      reason,
    }: {
      profileId: string;
      status: 'APPROVED' | 'REJECTED';
      reason?: string;
    }) =>
      reviewDeliveryProfileAdminApi(profileId, {
        status,
        rejectionReason: reason?.trim() || undefined,
      }),
    onSuccess: (_, variables) => {
      refresh();
      setRejectingProfile(null);
      setRejectionReason('');
      if (variables.status === 'APPROVED') {
        toast.success('Solicitud de repartidor aprobada', {
          description:
            'El usuario fue promovido al rol DELIVERY y ya puede operar en la Rider App.',
        });
      } else {
        toast.info('Solicitud de repartidor rechazada', {
          description:
            'El postulante podrá ver el motivo y volver a enviar su solicitud.',
        });
      }
    },
    onError: (err) =>
      toast.error('No se pudo procesar la solicitud', {
        description: extractErrorMessage(err),
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUserApi(id),
    onSuccess: () => {
      refresh();
      toast.success('Usuario eliminado');
    },
    onError: (err) =>
      toast.error('No se pudo eliminar', {
        description: extractErrorMessage(err),
      }),
  });

  const allUsers = useMemo(() => data?.data ?? [], [data?.data]);

  const pendingProfiles = useMemo(
    () => deliveryProfiles.filter((p) => p.status === 'PENDING'),
    [deliveryProfiles],
  );

  const pendingProfileByUserId = useMemo(() => {
    const map = new Map<string, DeliveryProfile>();
    for (const profile of pendingProfiles) {
      map.set(getProfileUserId(profile), profile);
    }
    return map;
  }, [pendingProfiles]);

  const filteredPendingProfiles = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return pendingProfiles;
    return pendingProfiles.filter((profile) => {
      const applicant = getPopulatedApplicant(profile);
      const haystack = [
        applicant?.name,
        applicant?.email,
        applicant?.phone,
        profile.phone,
        profile.licensePlate,
        profile.plate,
        profile.vehicleType,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [pendingProfiles, debouncedSearch]);

  const pendingCount = pendingProfiles.length;

  const visibleUsers = useMemo(() => {
    if (activeTab === 'ALL') return allUsers;
    if (activeTab === 'PENDING_RIDERS') return [];
    return allUsers.filter((u) => u.role === activeTab);
  }, [allUsers, activeTab]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-extrabold">
            Usuarios y roles
          </h2>
          <p className="text-xs text-slate-500">
            Gestiona cuentas, solicitudes de repartidor, teléfonos y estado de
            verificación
          </p>
        </div>
        <div className="w-full sm:w-72">
          <Input
            placeholder={
              activeTab === 'PENDING_RIDERS'
                ? 'Buscar por nombre, correo o placa...'
                : 'Buscar por nombre o correo...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Pestañas de filtro rápido y solicitudes de repartidor */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'ALL' as const, label: 'Todos' },
          {
            key: 'PENDING_RIDERS' as const,
            label: `Solicitudes Repartidor (${pendingCount})`,
          },
          { key: 'DELIVERY' as const, label: 'Repartidores' },
          { key: 'CLIENT' as const, label: 'Clientes' },
          { key: 'ADMIN' as const, label: 'Admins' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer',
              activeTab === tab.key
                ? 'bg-orange-600 text-white shadow-sm'
                : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
            )}
          >
            {tab.key === 'PENDING_RIDERS' && <Bike className="w-3.5 h-3.5" />}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'PENDING_RIDERS' ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Postulante</th>
                <th className="p-3">Vehículo y placa</th>
                <th className="p-3">Contacto</th>
                <th className="p-3">Solicitud</th>
                <th className="p-3 text-right">Decisión</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingProfiles && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    Cargando solicitudes de repartidor...
                  </td>
                </tr>
              )}
              {!isLoadingProfiles && filteredPendingProfiles.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No hay solicitudes de repartidor pendientes.
                  </td>
                </tr>
              )}
              {filteredPendingProfiles.map((profile) => {
                const applicant = getPopulatedApplicant(profile);
                const applicantId = getProfileUserId(profile);
                const applicantName = applicant?.name || 'Postulante';
                const applicantEmail = applicant?.email || applicantId;
                const applicantPhone =
                  profile.phone || applicant?.phone || 'Sin teléfono';
                const plateLabel =
                  profile.licensePlate || profile.plate || 'Sin placa';

                return (
                  <tr
                    key={profile._id}
                    className="border-b last:border-0 border-slate-100 dark:border-slate-800"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          src={
                            applicant?.avatarUrl || avatarsByUserId[applicantId]
                          }
                          name={applicantName}
                          className="h-10 w-10 rounded-xl shrink-0"
                          imgClassName="border border-slate-200 dark:border-slate-700"
                          fallbackClassName="text-xs"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold truncate">
                            {applicantName}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {applicantEmail}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                          {profile.vehicleType === 'CAR' ? (
                            <Car className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Bike className="w-4 h-4 text-blue-600" />
                          )}
                          <span>{VEHICLE_LABELS[profile.vehicleType]}</span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono">
                          Placa: {plateLabel}
                        </p>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{applicantPhone}</span>
                        </div>
                        {applicant?.isEmailVerified ? (
                          <Badge variant="success">
                            <MailCheck className="w-3 h-3 mr-1 inline" />
                            Correo verificado
                          </Badge>
                        ) : (
                          <Badge variant="neutral">
                            <Clock className="w-3 h-3 mr-1 inline" />
                            Sin verificar
                          </Badge>
                        )}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="space-y-1">
                        <Badge variant="warning">Pendiente</Badge>
                        {profile.createdAt && (
                          <p className="text-[11px] text-slate-500">
                            {formatDateTime(profile.createdAt)}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={reviewProfileMutation.isPending}
                          onClick={() =>
                            reviewProfileMutation.mutate({
                              profileId: profile._id,
                              status: 'APPROVED',
                            })
                          }
                          leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        >
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={reviewProfileMutation.isPending}
                          onClick={() => {
                            setRejectingProfile(profile);
                            setRejectionReason('');
                          }}
                          leftIcon={
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                          }
                        >
                          Rechazar
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Usuario</th>
                <th className="p-3">Contacto / Correo</th>
                <th className="p-3">Rol actual</th>
                <th className="p-3">Cambiar rol / Solicitud</th>
                <th className="p-3 text-right">Eliminar</th>
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
              {!isLoading && visibleUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No se encontraron usuarios en esta vista.
                  </td>
                </tr>
              )}
              {visibleUsers.map((u) => {
                const isSelf = u._id === currentUser?._id;
                const pendingProfile = pendingProfileByUserId.get(u._id);
                return (
                  <tr
                    key={u._id}
                    className="border-b last:border-0 border-slate-100 dark:border-slate-800"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedUserProfile(u)}
                          title={`Ver perfil y foto de ${u.name}`}
                          className="rounded-xl shrink-0 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-opacity hover:opacity-90 cursor-pointer"
                        >
                          <UserAvatar
                            src={u.avatarUrl || avatarsByUserId[u._id]}
                            name={u.name}
                            className="h-10 w-10 rounded-xl shrink-0"
                            imgClassName="border border-slate-200 dark:border-slate-700"
                            fallbackClassName="text-xs"
                          />
                        </button>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setSelectedUserProfile(u)}
                            className="font-semibold truncate block text-left hover:text-orange-600 transition-colors cursor-pointer"
                          >
                            {u.name}
                          </button>
                          <p className="text-xs text-slate-500 truncate">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{u.phone || 'Sin teléfono'}</span>
                        </div>
                        <div>
                          {u.isEmailVerified ? (
                            <Badge variant="success">
                              <MailCheck className="w-3 h-3 mr-1 inline" />
                              Correo verificado
                            </Badge>
                          ) : (
                            <Badge variant="neutral">
                              <Clock className="w-3 h-3 mr-1 inline" />
                              Verificación pendiente
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <RoleBadge role={u.role} />
                        {pendingProfile && (
                          <Badge variant="warning">Solicitud Rider</Badge>
                        )}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={u.role}
                          disabled={isSelf || roleMutation.isPending}
                          onChange={(e) =>
                            roleMutation.mutate({
                              id: u._id,
                              role: e.target.value as UserRole,
                            })
                          }
                          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs disabled:opacity-50"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>

                        {pendingProfile && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={reviewProfileMutation.isPending}
                              onClick={() =>
                                reviewProfileMutation.mutate({
                                  profileId: pendingProfile._id,
                                  status: 'APPROVED',
                                })
                              }
                              leftIcon={
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              }
                            >
                              Aprobar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={reviewProfileMutation.isPending}
                              onClick={() => {
                                setRejectingProfile(pendingProfile);
                                setRejectionReason('');
                              }}
                              leftIcon={
                                <XCircle className="w-3.5 h-3.5 text-red-600" />
                              }
                            >
                              Rechazar
                            </Button>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="p-3 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={isSelf}
                        title={
                          isSelf
                            ? 'No puedes eliminarte a ti mismo'
                            : 'Eliminar'
                        }
                        onClick={() => {
                          if (window.confirm(`¿Eliminar a ${u.name}?`))
                            deleteMutation.mutate(u._id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab !== 'PENDING_RIDERS' && data && (
        <PaginationBar
          meta={data.meta}
          itemLabel="usuarios"
          onPageChange={setPage}
        />
      )}

      {/* Modal de rechazo de solicitud de repartidor */}
      <Modal
        isOpen={Boolean(rejectingProfile)}
        onClose={() => {
          setRejectingProfile(null);
          setRejectionReason('');
        }}
        title="Rechazar solicitud de repartidor"
        description="Puedes indicar un motivo para que el postulante corrija sus datos y vuelva a intentarlo."
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setRejectingProfile(null);
                setRejectionReason('');
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              isLoading={reviewProfileMutation.isPending}
              onClick={() => {
                if (!rejectingProfile) return;
                reviewProfileMutation.mutate({
                  profileId: rejectingProfile._id,
                  status: 'REJECTED',
                  reason: rejectionReason,
                });
              }}
              leftIcon={<XCircle className="w-4 h-4" />}
            >
              Confirmar rechazo
            </Button>
          </div>
        }
      >
        {rejectingProfile && (
          <div className="space-y-3 py-1">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Postulante:{' '}
              <strong>
                {getPopulatedApplicant(rejectingProfile)?.name || 'Usuario'}
              </strong>{' '}
              ({VEHICLE_LABELS[rejectingProfile.vehicleType]}
              {rejectingProfile.licensePlate || rejectingProfile.plate
                ? ` · ${rejectingProfile.licensePlate || rejectingProfile.plate}`
                : ''}
              )
            </p>
            <div className="space-y-1.5">
              <label
                htmlFor="rejection-reason"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Motivo del rechazo (opcional)
              </label>
              <textarea
                id="rejection-reason"
                rows={3}
                maxLength={300}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ej. La placa registrada no es válida o falta el número de teléfono."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de vista rápida de perfil y foto del usuario */}
      <Modal
        isOpen={Boolean(selectedUserProfile)}
        onClose={() => setSelectedUserProfile(null)}
        title="Perfil de Usuario"
        description="Información de contacto, rol y foto de perfil registrada."
        size="sm"
        footer={
          <div className="flex justify-end w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedUserProfile(null)}
            >
              Cerrar
            </Button>
          </div>
        }
      >
        {selectedUserProfile && (
          <div className="flex flex-col items-center gap-4 py-2">
            <UserAvatar
              src={
                selectedUserProfile.avatarUrl ||
                avatarsByUserId[selectedUserProfile._id]
              }
              name={selectedUserProfile.name}
              className="h-36 w-36 rounded-3xl shadow-lg"
              imgClassName="border-4 border-orange-500/80"
              fallbackClassName="text-4xl"
            />
            <div className="text-center space-y-1.5">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {selectedUserProfile.name}
                </h3>
                <RoleBadge role={selectedUserProfile.role} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                <span>{selectedUserProfile.email}</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                <span>
                  {selectedUserProfile.phone || 'Sin teléfono registrado'}
                </span>
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
