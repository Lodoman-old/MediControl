import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { api, extractErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPass !== confirm) {
      setError("Las contrasenas no coinciden");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword: current,
        newPassword: newPass,
      });
      if (user) setUser({ ...user, mustChangePassword: false });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-alt p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo variant="horizontal" className="h-12" />
        </div>

        <div className="card">
          <h2 className="text-2xl font-semibold text-ink-900">
            Cambiar contrasena
          </h2>
          <p className="text-sm text-ink-500 mt-1">
            Es necesario cambiar tu contrasena antes de continuar.
          </p>

          {error && (
            <div className="mt-4 p-3 bg-danger-50 border border-danger-200 rounded-lg">
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="current" className="label">
                Contrasena actual
              </label>
              <input
                id="current"
                type="password"
                className="input"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="newPass" className="label">
                Nueva contrasena
              </label>
              <input
                id="newPass"
                type="password"
                className="input"
                autoComplete="new-password"
                placeholder="Min. 8 caracteres, mayuscula, minuscula, numero, especial"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="confirm" className="label">
                Confirmar nueva contrasena
              </label>
              <input
                id="confirm"
                type="password"
                className="input"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Actualizando..." : "Cambiar contrasena"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
