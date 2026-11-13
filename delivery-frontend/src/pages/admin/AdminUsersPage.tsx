import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, Trash2 } from 'lucide-react';
import {
  changeUserRoleApi,
  deleteUserApi,
  getAllUsersApi,
} from '@/api/endpoints/users.api';
import { extractErrorMessage } from '@/api/axios.client';
import type { UserRole } from '@/types/api.types';
import { useAuthStore } from '@/store/useAuthStore';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RoleBadge } from '@/components/ui/Badge';
import { PaginationBar } from '@/components/catalog/PaginationBar';

const ROLES: UserRole[] = ['CLIENT', 'DELIVERY', 'ADMIN'];

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

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
      toast.error('No se pudo eliminar', { description: extractErrorMessage(err) }),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="font-heading text-2xl font-extrabold">Usuarios y roles</h2>
        <div className="w-full sm:w-72">
          <Input
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3">Usuario</th>
              <th className="p-3">Rol actual</th>
              <th className="p-3">Cambiar rol</th>
              <th className="p-3 text-right">Eliminar</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-slate-500">
                  Cargando...
                </td>
              </tr>
            )}
            {(data?.data ?? []).map((u) => {
              const isSelf = u._id === currentUser?._id;
              return (
                <tr
                  key={u._id}
                  className="border-b last:border-0 border-slate-100 dark:border-slate-800"
                >
                  <td className="p-3">
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </td>
                  <td className="p-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="p-3">
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
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={isSelf}
                      title={isSelf ? 'No puedes eliminarte a ti mismo' : 'Eliminar'}
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
