import { useState, useRef, useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { useAuthStore } from "@/stores/authStore";
import { roleLabels } from "@/lib/roles";
import { useLogout } from "@/hooks/useAuth";

interface Props {
  children: ReactNode;
}

function Dropdown({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-sm text-ink-600 hover:text-ink-900 font-medium whitespace-nowrap"
      >
        {label} <span className="text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-ink-200 rounded-lg shadow-lg py-1 min-w-40 z-50">
          {children}
        </div>
      )}
    </div>
  );
}

export default function AppLayout({ children }: Props) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  const handleLogout = async () => {
    await logout.mutateAsync();
    navigate("/login", { replace: true });
  };

  const displayName = user?.fullName ?? "Cargando...";
  const initials =
    displayName
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  const roles = user?.roles ?? [];
  const isAdmin = roles.includes("ADMIN") || roles.includes("SUPERADMIN");
  const isDoctor = roles.includes("DOCTOR");
  const isReception = roles.includes("RECEPTION");
  const isNurse = roles.includes("NURSE");
  const isCajero = roles.includes("CAJERO");
  const hasClinicalAccess = roles.some((r) => ["ADMIN", "DOCTOR", "NURSE", "RECEPTION", "SUPERADMIN"].includes(r));

  const NavLink = ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <Link
      to={to}
      className={`block px-4 py-2 text-sm text-ink-700 hover:bg-ink-50 hover:text-ink-900 ${className ?? ""}`}
      onClick={() => {
        /* close dropdown handled by outside click */
      }}
    >
      {children}
    </Link>
  );

  return (
    <div className="min-h-screen flex flex-col bg-surface-alt">
      <header className="bg-white border-b border-ink-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard">
            <Logo variant="horizontal" className="h-9" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-ink-900 font-medium leading-tight">
                {displayName}
              </p>
              <p className="text-xs text-ink-500">
                {user ? roleLabels(user.roles) : "..."}
              </p>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold">
              {initials}
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Link to="/agenda" className="text-sm text-ink-600 hover:text-ink-900 font-medium whitespace-nowrap">
                Agenda
              </Link>

              {isNurse && (
                <Link to="/triage" className="text-sm text-ink-600 hover:text-ink-900 font-medium whitespace-nowrap">
                  Triage
                </Link>
              )}

              {hasClinicalAccess && (
                <Link to="/expediente" className="text-sm text-ink-600 hover:text-ink-900 font-medium whitespace-nowrap">
                  Expedientes
                </Link>
              )}

              {isDoctor && (
                <Dropdown label="Medico">
                  <NavLink to="/appointments/pending">Confirmar citas</NavLink>
                  <NavLink to="/schedule">Horarios</NavLink>
                </Dropdown>
              )}

              {(isReception || isAdmin) && (
                <Dropdown label="Recepcion">
                  <NavLink to="/patients/new">Registrar paciente</NavLink>
                  <NavLink to="/appointments/new">Nueva cita</NavLink>
                </Dropdown>
              )}

              {(isDoctor || isAdmin) && (
                <Link to="/pagos" className="text-sm text-ink-600 hover:text-ink-900 font-medium whitespace-nowrap">
                  Pagos
                </Link>
              )}

              {(isAdmin || isDoctor || isCajero) && (
                <Link to="/farmacia" className="text-sm text-ink-600 hover:text-ink-900 font-medium whitespace-nowrap">
                  Farmacia
                </Link>
              )}

              {isAdmin && (
                <Dropdown label="Admin">
                  <NavLink to="/reportes">Reportes</NavLink>
                  <NavLink to="/schedule">Horarios</NavLink>
                  <NavLink to="/admin/ubicaciones">Ubicaciones</NavLink>
                  <NavLink to="/admin/servicios">Servicios</NavLink>
                  <NavLink to="/admin/roles">Roles</NavLink>
                  <NavLink to="/admin/users" className="font-semibold text-primary-600">Usuarios</NavLink>
                </Dropdown>
              )}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-ink-600 hover:text-ink-900 whitespace-nowrap"
            >
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {children}
      </main>
    </div>
  );
}
