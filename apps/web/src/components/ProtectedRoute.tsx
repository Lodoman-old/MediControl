import { useState, useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuthStore, selectIsAuthenticated } from "@/stores/authStore";
import { isTokenExpired } from "@/lib/jwt";

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
  const accessToken = useAuthStore((s) => s.accessToken);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const clear = useAuthStore((s) => s.clear);
  const [validating, setValidating] = useState(true);

  useEffect(() => {
    if (!isAuthed || !accessToken) {
      setValidating(false);
      return;
    }

    if (!isTokenExpired(accessToken)) {
      setValidating(false);
      return;
    }

    let cancelled = false;
    api.post("/auth/refresh", {}).then(({ data }) => {
      if (!cancelled) {
        setAccessToken(data.tokens.accessToken);
        setValidating(false);
      }
    }).catch(() => {
      if (!cancelled) {
        clear();
        setValidating(false);
      }
    });
    return () => { cancelled = true; };
  }, [isAuthed, accessToken, setAccessToken, clear]);

  if (validating) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-alt">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-ink-500 text-sm mt-3">Verificando sesion...</p>
        </div>
      </div>
    );
  }

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
