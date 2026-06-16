import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { api, extractErrorMessage } from "@/lib/api";

export default function MfaSetupPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState<"setup" | "verify">("setup");
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    api.get<{ id: string; mfaEnabled: boolean }>("/auth/me").then((res) => {
      setMfaEnabled(res.data.mfaEnabled ?? false);
    }).catch(() => setMfaEnabled(false));
  }, []);

  useEffect(() => {
    if (uri && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, uri, { width: 240, margin: 2 });
    }
  }, [uri]);

  const onSetup = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{ secret: string; uri: string }>("/auth/mfa/setup");
      setSecret(res.data.secret);
      setUri(res.data.uri);
      setStep("verify");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/mfa/verify", { code });
      setSuccess(true);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onDisable = async () => {
    const pwd = prompt("Ingresa tu contrasena para deshabilitar MFA:");
    if (!pwd) return;
    const totp = prompt("Ingresa el codigo TOTP de tu app autenticadora:");
    if (!totp) return;
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/mfa/disable", { password: pwd, code: totp });
      setMfaEnabled(false);
      setStep("setup");
      setSuccess(false);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (mfaEnabled === null) return null;

  if (mfaEnabled && !success) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <h2 className="text-2xl font-semibold text-ink-900">
          Autenticacion de dos factores (MFA)
        </h2>
        <div className="card">
          <p className="text-sm text-ink-600">
            MFA esta habilitado en tu cuenta.
          </p>
          {error && (
            <div className="mt-4 p-3 bg-danger-50 border border-danger-200 rounded-lg">
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          )}
          <button
            onClick={onDisable}
            disabled={loading}
            className="btn-danger w-full mt-4"
          >
            {loading ? "Deshabilitando..." : "Deshabilitar MFA"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h2 className="text-2xl font-semibold text-ink-900">
        Autenticacion de dos factores (MFA)
      </h2>

      {success ? (
        <div className="card">
          <div className="p-4 bg-success-50 border border-success-200 rounded-lg">
            <p className="text-sm text-success-700 font-medium">
              MFA habilitado exitosamente
            </p>
            <p className="text-xs text-success-600 mt-1">
              En tu proximo inicio de sesion se te pedira un codigo TOTP.
            </p>
          </div>
        </div>
      ) : step === "setup" ? (
        <div className="card space-y-4">
          <p className="text-sm text-ink-600">
            Agrega una capa extra de seguridad a tu cuenta. Al habilitar MFA, se te
            solicitara un codigo de 6 digitos de tu app autenticadora al iniciar
            sesion.
          </p>
          {error && (
            <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          )}
          <button
            onClick={onSetup}
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "Generando..." : "Configurar MFA"}
          </button>
        </div>
      ) : (
        <div className="card space-y-4">
          <p className="text-sm text-ink-600">
            1. Escanea el codigo QR con tu app autenticadora (Google
            Authenticator, Authy, etc.).
          </p>
          <div className="flex justify-center">
            <canvas ref={canvasRef} className="rounded-lg border border-ink-200" />
          </div>
          <div className="p-3 bg-surface-alt rounded-lg">
            <p className="text-xs text-ink-500 mb-1">
              O ingresa manualmente esta clave:
            </p>
            <p className="text-sm font-mono text-ink-900 select-all break-all">
              {secret}
            </p>
          </div>
          <p className="text-sm text-ink-600">
            2. Ingresa el codigo de 6 digitos para verificar la configuracion.
          </p>
          {error && (
            <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          )}
          <form onSubmit={onVerify} className="space-y-3">
            <input
              type="text"
              inputMode="numeric"
              className="input text-center text-2xl tracking-widest"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
            />
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="btn-primary w-full"
            >
              {loading ? "Verificando..." : "Verificar y habilitar"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
