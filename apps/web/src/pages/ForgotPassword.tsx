import { useState } from "react";
import { Link } from "react-router-dom";
import { api, extractErrorMessage } from "@/lib/api";
import Logo from "@/components/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    setError(null);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-alt p-6">
        <div className="card max-w-md w-full text-center space-y-4">
          <Logo className="h-10 mx-auto" />
          <h2 className="text-xl font-semibold text-ink-900">Revisa tu correo</h2>
          <p className="text-sm text-ink-500">
            Si la cuenta existe, recibiras un enlace para restablecer tu contrasena en {email}.
          </p>
          <Link to="/login" className="text-sm text-primary-600 hover:underline inline-block">
            Volver al inicio de sesion
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
          <h2 className="text-xl font-semibold text-ink-900">Recuperar contrasena</h2>
          <p className="text-sm text-ink-500 mt-1">
            Ingresa tu correo y te enviaremos un enlace para restablecer tu contrasena.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
            <p className="text-sm text-danger-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="label">Correo electronico</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="medico@clinica.mx"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={sending} className="btn-primary w-full">
            {sending ? "Enviando..." : "Enviar enlace"}
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
