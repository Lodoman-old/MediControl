import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore, selectIsAuthenticated } from "@/stores/authStore";

interface Props {
  children: ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
}

export default function ProtectedRoute({
  children,
  requiredRoles,
  requiredPermissions,
}: Props) {
  const location = useLocation();
  const isAuthed = useAuthStore(selectIsAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user?.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const has = requiredRoles.some((r) => user?.roles.includes(r));
    if (!has) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-alt p-6">
          <div className="card max-w-md text-center">
            <h2 className="text-xl font-semibold text-ink-900">Sin permisos</h2>
            <p className="text-ink-500 mt-2">
              Tu cuenta no tiene acceso a esta seccion.
            </p>
          </div>
        </div>
      );
    }
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    const has = requiredPermissions.every((p) => user?.permissions.includes(p));
    if (!has) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-alt p-6">
          <div className="card max-w-md text-center">
            <h2 className="text-xl font-semibold text-ink-900">Sin permisos</h2>
            <p className="text-ink-500 mt-2">
              Te faltan permisos para acceder a esta seccion.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
