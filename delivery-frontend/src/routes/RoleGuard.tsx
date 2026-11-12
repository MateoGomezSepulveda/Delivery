import { Link, Outlet } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import type { UserRole } from '@/types/api.types';
import { Button } from '@/components/ui/Button';
import { RoleBadge } from '@/components/ui/Badge';

interface RoleGuardProps {
  allowedRoles: UserRole[];
}

export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const { user } = useAuthStore();

  if (!user) {
    return null;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[65vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-slate-900 p-8 text-center shadow-card space-y-5">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Acceso Restringido por Rol (RBAC)
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Esta sección requiere uno de los siguientes roles:{' '}
              <strong>{allowedRoles.join(', ')}</strong>.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 p-3 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2">
            <span>Tu rol actual es:</span>
            <RoleBadge role={user.role} />
          </div>

          <div className="pt-2">
            <Link to="/">
              <Button
                variant="primary"
                className="w-full"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Volver a mi Portal Principal
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
