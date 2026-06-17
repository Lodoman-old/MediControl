import { useState, useRef, useEffect, type ReactNode } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout.mutateAsync();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
    >
      {children}
    </Link>
  );

  const MobileNavLink = ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <Link
      to={to}
      onClick={() => setMobileMenuOpen(false)}
      className={`block px-4 py-3 text-base text-ink-700 hover:bg-ink-50 hover:text-primary-700 border-b border-ink-100/50 ${className ?? ""}`}
    >
      {children}
    </Link>
  );

  const navItems = (
    <>
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
        <Dropdown label="Farmacia">
          <NavLink to="/farmacia">POS / Vender</NavLink>
          <NavLink to="/farmacia/ventas">Historial</NavLink>
          <NavLink to="/farmacia/reporte-ventas">Reporte</NavLink>
          <NavLink to="/farmacia/ajustes">Ajustar stock</NavLink>
          <NavLink to="/farmacia/caja">Corte de caja</NavLink>
        </Dropdown>
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
    </>
  );

  const mobileNavItems = (
    <>
      <MobileNavLink to="/agenda">Agenda</MobileNavLink>

      {isNurse && (
        <MobileNavLink to="/triage">Triage</MobileNavLink>
      )}

      {hasClinicalAccess && (
        <MobileNavLink to="/expediente">Expedientes</MobileNavLink>
      )}

      {isDoctor && (
        <>
          <div className="px-4 py-2 text-xs font-semibold text-ink-400 uppercase tracking-wider bg-ink-50/50">Medico</div>
          <MobileNavLink to="/appointments/pending">Confirmar citas</MobileNavLink>
          <MobileNavLink to="/schedule">Horarios</MobileNavLink>
        </>
      )}

      {(isReception || isAdmin) && (
        <>
          <div className="px-4 py-2 text-xs font-semibold text-ink-400 uppercase tracking-wider bg-ink-50/50">Recepcion</div>
          <MobileNavLink to="/patients/new">Registrar paciente</MobileNavLink>
          <MobileNavLink to="/appointments/new">Nueva cita</MobileNavLink>
        </>
      )}

      {(isDoctor || isAdmin) && (
        <MobileNavLink to="/pagos">Pagos</MobileNavLink>
      )}

      {(isAdmin || isDoctor || isCajero) && (
        <>
          <div className="px-4 py-2 text-xs font-semibold text-ink-400 uppercase tracking-wider bg-ink-50/50">Farmacia</div>
          <MobileNavLink to="/farmacia">POS / Vender</MobileNavLink>
          <MobileNavLink to="/farmacia/ventas">Historial</MobileNavLink>
          <MobileNavLink to="/farmacia/reporte-ventas">Reporte</MobileNavLink>
          <MobileNavLink to="/farmacia/ajustes">Ajustar stock</MobileNavLink>
          <MobileNavLink to="/farmacia/caja">Corte de caja</MobileNavLink>
        </>
      )}

      {isAdmin && (
        <>
          <div className="px-4 py-2 text-xs font-semibold text-ink-400 uppercase tracking-wider bg-ink-50/50">Administracion</div>
          <MobileNavLink to="/reportes">Reportes</MobileNavLink>
          <MobileNavLink to="/schedule">Horarios</MobileNavLink>
          <MobileNavLink to="/admin/ubicaciones">Ubicaciones</MobileNavLink>
          <MobileNavLink to="/admin/servicios">Servicios</MobileNavLink>
          <MobileNavLink to="/admin/roles">Roles</MobileNavLink>
          <MobileNavLink to="/admin/users">Usuarios</MobileNavLink>
        </>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-surface-alt">
      <header className="bg-white border-b border-ink-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link to="/dashboard" className="shrink-0">
            <Logo variant="horizontal" className="h-7 sm:h-9" />
          </Link>

          {!isMobile && (
            <div className="flex items-center gap-2 xl:gap-3">
              <div className="text-right mr-1">
                <p className="text-sm text-ink-900 font-medium leading-tight">{displayName}</p>
                <p className="text-xs text-ink-500">{user ? roleLabels(user.roles) : "..."}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold shrink-0">
                {initials}
              </div>
              <div className="flex items-center gap-2 xl:gap-3 text-sm ml-2">
                {navItems}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm text-ink-600 hover:text-ink-900 whitespace-nowrap ml-2"
              >
                Salir
              </button>
            </div>
          )}

          {isMobile && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-xs shrink-0">
                {initials}
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 -mr-2 text-ink-600 hover:text-ink-900"
                aria-label="Abrir menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute top-0 right-0 bottom-0 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 border-b border-ink-100 shrink-0">
              <span className="text-sm font-semibold text-ink-900">{displayName}</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 -mr-1 text-ink-500 hover:text-ink-700"
                aria-label="Cerrar menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {mobileNavItems}
            </div>
            <div className="border-t border-ink-100 px-4 py-3 shrink-0">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium text-danger-700 bg-danger-50 hover:bg-danger-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Cerrar sesion
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-8">
        {children}
      </main>
    </div>
  );
}
