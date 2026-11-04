import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, extractErrorMessage } from "@/lib/api";
import Logo from "@/components/Logo";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("El enlace no incluye un token valido.");
      return;
    }
    if (password !== confirm) {
      setError("Las contrasenas no coinciden.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post("/auth/reset-password", { token, newPassword: password });
      setDone(true);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-alt p-6">
        <div className="card max-w-md w-full text-center space-y-4">
          <Logo className="h-10 mx-auto" />
          <h2 className="text-xl font-semibold text-ink-900">Enlace invalido</h2>
          <p className="text-sm text-ink-500">
            Este enlace no contiene un token. Solicita una nueva invitacion o recuperacion de contrasena.
          </p>
          <Link to="/forgot-password" className="text-sm text-primary-600 hover:underline inline-block">
            Solicitar enlace
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-alt p-6">
        <div className="card max-w-md w-full text-center space-y-4">
          <Logo className="h-10 mx-auto" />
          <h2 className="text-xl font-semibold text-ink-900">Contrasena creada</h2>
          <p className="text-sm text-ink-500">
            Ya puedes entrar al portal del paciente con tu correo y tu nueva contrasena.
          </p>
          <Link to="/login" className="btn-primary inline-block">
            Ir al inicio de sesion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-alt p-6">
      <div className="card max-w-md w-full space-y-6">
        <Logo className="h-10 mx-auto" />
        <div className="text-center">
          <h2 className="text-xl font-semibold text-ink-900">Crea tu contrasena</h2>
          <p className="text-sm text-ink-500 mt-1">
            Usa al menos 8 caracteres, una mayuscula, una minuscula, un numero y un caracter especial.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
            <p className="text-sm text-danger-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="label">Nueva contrasena</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div>
            <label htmlFor="confirm" className="label">Confirmar contrasena</label>
            <input
              id="confirm"
              type="password"
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? "Guardando..." : "Crear contrasena"}
          </button>
        </form>

        <p className="text-sm text-center">
          <Link to="/login" className="text-primary-600 hover:underline">
            Volver al inicio de sesion
          </Link>
        </p>
      </div>
    </div>
  );
}
