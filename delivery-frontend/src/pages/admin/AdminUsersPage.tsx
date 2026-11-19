import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Bike,
  CheckCircle2,
  Clock,
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
import { extractErrorMessage } from '@/api/axios.client';
import type { UserRole } from '@/types/api.types';
import type { User } from '@/types/auth.types';
import { useAuthStore } from '@/store/useAuthStore';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, RoleBadge } from '@/components/ui/Badge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { PaginationBar } from '@/components/catalog/PaginationBar';
import { cn } from '@/utils/cn';

const ROLES: UserRole[] = ['CLIENT', 'DELIVERY', 'ADMIN'];
type UserTab = 'ALL' | 'PENDING_RIDERS' | UserRole;

function isPendingRider(u: User): boolean {
  return u.riderRequestStatus === 'PENDING';
}

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<UserTab>('ALL');
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

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });

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
  const pendingCount = useMemo(
    () => allUsers.filter(isPendingRider).length,
    [allUsers],
  );

  const visibleUsers = useMemo(() => {
    if (activeTab === 'ALL') return allUsers;
    if (activeTab === 'PENDING_RIDERS') {
      return allUsers.filter(isPendingRider);
    }
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
            placeholder="Buscar por nombre o correo..."
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
                  {activeTab === 'PENDING_RIDERS'
                    ? 'No hay solicitudes de repartidor pendientes.'
                    : 'No se encontraron usuarios en esta vista.'}
                </td>
              </tr>
            )}
            {visibleUsers.map((u) => {
              const isSelf = u._id === currentUser?._id;
              const pendingRider = isPendingRider(u);
              return (
                <tr
                  key={u._id}
                  className="border-b last:border-0 border-slate-100 dark:border-slate-800"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        src={u.avatarUrl}
                        name={u.name}
                        className="h-10 w-10 rounded-xl shrink-0"
                        imgClassName="border border-slate-200 dark:border-slate-700"
                        fallbackClassName="text-xs"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{u.name}</p>
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
                      {pendingRider && (
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

                      {pendingRider && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={roleMutation.isPending}
                            onClick={() =>
                              roleMutation.mutate({
                                id: u._id,
                                role: 'DELIVERY',
                              })
                            }
                            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          >
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={roleMutation.isPending}
                            onClick={() =>
                              roleMutation.mutate({
                                id: u._id,
                                role: 'CLIENT',
                              })
                            }
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
                        isSelf ? 'No puedes eliminarte a ti mismo' : 'Eliminar'
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

      {data && (
        <PaginationBar
          meta={data.meta}
          itemLabel="usuarios"
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
