import { useState } from "react";
import { useWebPush } from "@/hooks/useWebPush";

export default function WebPushPrompt() {
  const { status, error, working, enable } = useWebPush();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || status === "loading" || status === "unsupported" || status === "disabled" || status === "subscribed") {
    return null;
  }

  if (status === "denied") {
    return null;
  }

  const isIosInstall = status === "ios-install";

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-20 lg:bottom-6 z-40 w-[calc(100%-2rem)] max-w-xl">
      <div className="bg-white border border-ink-200 shadow-xl rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink-900">
            {isIosInstall ? "Activa las notificaciones en tu iPhone" : "Activa las notificaciones"}
          </p>
          <p className="text-xs text-ink-500 mt-1">
            {isIosInstall
              ? "Abre Compartir en Safari, elige “Agregar a pantalla de inicio”, abre MediControl desde el ícono y vuelve a intentar."
              : "Recibe avisos de citas, recetas y confirmaciones en este dispositivo."}
          </p>
          {error && <p className="text-xs text-danger-600 mt-1">{error}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isIosInstall && (
            <button
              type="button"
              onClick={() => void enable()}
              disabled={working}
              className="btn-primary text-sm"
            >
              {working ? "Activando..." : "Activar"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="btn-secondary text-sm"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}
