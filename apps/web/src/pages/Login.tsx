import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useLocation } from "react-router-dom";
import Logo from "@/components/Logo";
import { useLogin, useVerifyMfaLogin } from "@/hooks/useAuth";
import { useAuthStore, selectIsAuthenticated } from "@/stores/authStore";
import type { AuthUser } from "@/stores/authStore";
import { api, extractErrorMessage } from "@/lib/api";

const loginSchema = z.object({
  email: z.string().email("Correo invalido"),
  password: z.string().min(8, "Minimo 8 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

interface FromState {
  from?: { pathname?: string };
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthed = useAuthStore(selectIsAuthenticated);
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const login = useLogin();
  const verifyMfa = useVerifyMfaLogin();
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (!isAuthed) {
      setCheckingSession(false);
      return;
    }
    api.get("/auth/me").then(() => {
      setCheckingSession(false);
      if (user?.mustChangePassword) {
        navigate("/change-password", { replace: true });
      } else {
        const from = (location.state as FromState | null)?.from?.pathname ?? "/dashboard";
        navigate(from, { replace: true });
      }
    }).catch(() => {
      clear();
      setCheckingSession(false);
    });
  }, []);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const result = await login.mutateAsync(data);
      if (result.mfaRequired && result.mfaToken) {
        setMfaToken(result.mfaToken);
        return;
      }
      if (result.user?.mustChangePassword) {
        navigate("/change-password", { replace: true });
      } else {
        const from = (location.state as FromState | null)?.from?.pathname ?? "/dashboard";
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error(extractErrorMessage(err));
    }
  });

  const onMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaToken) return;
    setMfaError(null);
    try {
      const result = await verifyMfa.mutateAsync({ mfaToken, code: mfaCode });
      if (result.user?.mustChangePassword) {
        navigate("/change-password", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setMfaError(extractErrorMessage(err));
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-alt">
        <p className="text-ink-500">Verificando sesion...</p>
      </div>
    );
  }

  if (mfaToken) {
    return (
      <div className="min-h-screen grid lg:grid-cols-2">
        <aside className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary-600 to-primary-800 p-12 text-white">
          <Logo variant="isopo" className="h-14 w-14 bg-white rounded-lg p-2" />
          <div>
            <h1 className="text-4xl font-bold leading-tight">
              Autenticacion<br />de dos factores
            </h1>
            <p className="mt-4 text-primary-50 max-w-md">
              Ingresa el codigo de 6 digitos generado por tu app autenticadora.
            </p>
          </div>
          <p className="text-sm text-primary-100">
            &copy; {new Date().getFullYear()} MediControl.
          </p>
        </aside>
        <main className="flex items-center justify-center p-6 bg-gradient-to-br from-primary-600 to-primary-800 lg:bg-surface-alt">
          <div className="w-full max-w-md">
            <div className="lg:hidden mb-6 flex justify-center">
              <Logo variant="isopo" className="h-14 w-14 bg-white rounded-lg p-2" />
            </div>
            <div className="lg:card space-y-1">
              <h2 className="text-2xl font-semibold text-white lg:text-ink-900">
                Codigo de verificacion
              </h2>
              <p className="text-sm text-primary-100 lg:text-ink-500 mt-1">
                Abre tu app autenticadora e ingresa el codigo de 6 digitos para{" "}
                <span className="font-medium text-white lg:text-ink-900">{getValues("email")}</span>.
              </p>
              {mfaError && (
                <div className="mt-4 p-3 bg-danger-50 border border-danger-200 rounded-lg">
                  <p className="text-sm text-danger-700">{mfaError}</p>
                </div>
              )}
              <form onSubmit={onMfaSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="mfaCode" className="label text-primary-100 lg:text-ink-700">
                    Codigo TOTP
                  </label>
                  <input
                    id="mfaCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="w-full rounded-md border border-primary-300 lg:border-ink-300 bg-white/10 lg:bg-white px-3 py-2 text-center text-2xl tracking-widest text-white lg:text-ink-900 placeholder:text-primary-200 lg:placeholder:text-ink-400 focus:border-white lg:focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-white/30 lg:focus:ring-primary-500/20"
                    placeholder="000000"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={verifyMfa.isPending || mfaCode.length !== 6}
                  className="w-full rounded-md px-4 py-2.5 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 bg-white text-primary-700 hover:bg-primary-50 focus:ring-primary-500 lg:text-white lg:bg-primary-500 lg:hover:bg-primary-600 lg:focus:ring-primary-500"
                >
                  {verifyMfa.isPending ? "Verificando..." : "Verificar"}
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <aside className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary-600 to-primary-800 p-12 text-white">
        <Logo variant="isopo" className="h-14 w-14 bg-white rounded-lg p-2" />
        <div>
          <h1 className="text-4xl font-bold leading-tight">
            Tu consultorio,<br />en orden.
          </h1>
          <p className="mt-4 text-primary-50 max-w-md">
            Agenda, expediente clinico y pagos en una sola plataforma. Cumple
            NOM-004 y NOM-024, escalable a hospital cuando lo necesites.
          </p>
        </div>
        <p className="text-sm text-primary-100">
          &copy; {new Date().getFullYear()} MediControl. Todos los derechos reservados.
        </p>
      </aside>

      <main className="flex items-center justify-center p-6 bg-gradient-to-br from-primary-600 to-primary-800 lg:bg-surface-alt">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-6 flex justify-center">
            <Logo variant="isopo" className="h-14 w-14 bg-white rounded-lg p-2" />
          </div>

          <div className="lg:card space-y-1">
            <h2 className="text-2xl font-semibold text-white lg:text-ink-900">
              Iniciar sesion
            </h2>
            <p className="text-sm text-primary-100 lg:text-ink-500 mt-1">
              Acceso para personal administrativo y medicos.
            </p>

            {login.isError && (
              <div className="mt-4 p-3 bg-danger-50 border border-danger-200 rounded-lg">
                <p className="text-sm text-danger-700">
                  {extractErrorMessage(login.error)}
                </p>
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="label text-primary-100 lg:text-ink-700">
                  Correo electronico
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="w-full rounded-md border border-primary-300 lg:border-ink-300 bg-white/10 lg:bg-white px-3 py-2 text-white lg:text-ink-900 placeholder:text-primary-200 lg:placeholder:text-ink-400 focus:border-white lg:focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-white/30 lg:focus:ring-primary-500/20"
                  placeholder="medico@clinica.mx"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-red-300 lg:text-danger-500 text-xs mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="label text-primary-100 lg:text-ink-700">
                  Contrasena
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="w-full rounded-md border border-primary-300 lg:border-ink-300 bg-white/10 lg:bg-white px-3 py-2 text-white lg:text-ink-900 placeholder:text-primary-200 lg:placeholder:text-ink-400 focus:border-white lg:focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-white/30 lg:focus:ring-primary-500/20"
                  placeholder="********"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-red-300 lg:text-danger-500 text-xs mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={login.isPending}
                className="w-full rounded-md px-4 py-2.5 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 bg-white text-primary-700 hover:bg-primary-50 focus:ring-primary-500 lg:text-white lg:bg-primary-500 lg:hover:bg-primary-600 lg:focus:ring-primary-500"
              >
                {login.isPending ? "Ingresando..." : "Ingresar"}
              </button>
            </form>

            <p className="text-xs text-primary-200 lg:text-ink-500 mt-6 text-center">
              Al continuar aceptas nuestro{" "}
              <a href="#" className="text-white lg:text-primary-600 hover:underline">
                Aviso de Privacidad
              </a>
              .
            </p>
          </div>

          <div className="mt-4 p-3 bg-white/10 lg:bg-white border border-primary-200 lg:border-ink-100 rounded-lg text-xs text-primary-100 lg:text-ink-500">
            <p className="font-semibold text-white lg:text-ink-700 mb-1">Cuentas demo:</p>
            <p>admin@medicontrol.mx / Admin123!Demo</p>
            <p>doctor@medicontrol.mx / Doctor123!Demo</p>
          </div>
        </div>
      </main>
    </div>
  );
}
