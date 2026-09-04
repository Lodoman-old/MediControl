import { useState, useEffect } from "react";
import Logo from "@/components/Logo";

type Tab = "android" | "iphone";

export default function DescargarAppPage() {
  const [tab, setTab] = useState<Tab>("android");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100">
      <div className="max-w-2xl mx-auto px-4 py-10 sm:py-16">
        <div className="text-center mb-10">
          <Logo variant="horizontal" className="h-10 mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-ink-900">Descargar MediControl</h1>
          <p className="text-ink-500 mt-2">Instala la app en tu dispositivo para acceso rapido</p>
        </div>

        <div className="flex gap-2 mb-6 justify-center">
          <button
            onClick={() => setTab("android")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "android" ? "bg-primary-600 text-white shadow" : "bg-white text-ink-600 border border-ink-200 hover:bg-ink-50"
            }`}
          >
            Android (APK)
          </button>
          <button
            onClick={() => setTab("iphone")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "iphone" ? "bg-primary-600 text-white shadow" : "bg-white text-ink-600 border border-ink-200 hover:bg-ink-50"
            }`}
          >
            iPhone / iPad (PWA)
          </button>
        </div>

        {tab === "android" && (
          <div className="bg-white rounded-2xl shadow-lg border border-ink-100 overflow-hidden">
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-success-100 flex items-center justify-center">
                  <svg className="w-7 h-7 text-success-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.523 2.094a.396.396 0 00-.046-.003h-10.95a.396.396 0 00-.046.003C4.94 2.555 3.5 4.392 3.5 6.5v11c0 2.108 1.44 3.945 3.024 4.406.026.006.046.018.072.022a.38.38 0 00.105.015h10.6c.035 0 .072-.006.105-.015.026-.004.046-.016.072-.022C19.06 21.445 20.5 19.608 20.5 17.5v-11c0-2.108-1.44-3.945-3.024-4.406zM7.5 4h9l.5.001c.16.018.32.046.478.083C18.39 4.558 19 5.442 19 6.5v.5H5v-.5c0-1.058.61-1.942 1.522-2.416A4.48 4.48 0 017.5 4zM5 9h14v8.5c0 1.058-.61 1.942-1.522 2.416A4.48 4.48 0 0116.5 20h-9a4.48 4.48 0 01-1.978-.584C4.61 18.942 4 18.058 4 17V9z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-ink-900">Instalar en Android</h2>
                  <p className="text-sm text-ink-500">Descarga e instala el APK directamente</p>
                </div>
              </div>

              {isInstallable && (
                <button
                  onClick={handleInstall}
                  className="w-full mb-6 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200"
                >
                  Instalar desde el navegador
                </button>
              )}

              <a
                href="/MediControl.apk"
                download
                className="block w-full py-3 rounded-xl bg-ink-900 text-white font-semibold text-center hover:bg-ink-800 transition-colors"
              >
                Descargar APK
              </a>

              <div className="mt-8 space-y-4">
                <h3 className="font-semibold text-ink-900">Pasos para instalar:</h3>
                <ol className="space-y-3 text-sm text-ink-700">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">1</span>
                    <span>Toca <strong>"Descargar APK"</strong> y espera a que se descargue el archivo.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">2</span>
                    <span>Ve a <strong>Configuracion &gt; Seguridad</strong> y activa <strong>"Fuentes desconocidas"</strong> (si no lo tienes activado).</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">3</span>
                    <span>Abre el archivo <strong>MediControl.apk</strong> desde tu gestor de archivos o notificaciones.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">4</span>
                    <span>Toca <strong>"Instalar"</strong> y listo. La app aparecera en tu cajon de aplicaciones.</span>
                  </li>
                </ol>
              </div>

              <div className="mt-6 p-3 bg-warning-50 border border-warning-200 rounded-lg text-sm text-warning-700">
                <strong>Nota:</strong> En Android 13+, es posible que necesites permitir instalaciones desde tu navegador en la configuracion de apps.
              </div>
            </div>
          </div>
        )}

        {tab === "iphone" && (
          <div className="bg-white rounded-2xl shadow-lg border border-ink-100 overflow-hidden">
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-info-100 flex items-center justify-center">
                  <svg className="w-7 h-7 text-info-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-ink-900">Instalar en iPhone / iPad</h2>
                  <p className="text-sm text-ink-500">Usa la funcion PWA del navegador Safari</p>
                </div>
              </div>

              <div className="p-3 bg-success-50 border border-success-200 rounded-lg text-sm text-success-700 mb-6">
                <strong>Si funciona con PWA.</strong> MediControl esta disenaado como Progressive Web App, lo que significa que puedes instalarlo como una app nativa desde Safari sin necesidad de App Store.
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-ink-900">Pasos para instalar:</h3>
                <ol className="space-y-3 text-sm text-ink-700">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-info-100 text-info-700 flex items-center justify-center font-bold text-xs">1</span>
                    <span>Abre <strong>Safari</strong> en tu iPhone o iPad y ve a la direccion de la app.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-info-100 text-info-700 flex items-center justify-center font-bold text-xs">2</span>
                    <span>Toca el boton de <strong>Compartir</strong> (el cuadro con flecha hacia arriba) en la barra inferior.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-info-100 text-info-700 flex items-center justify-center font-bold text-xs">3</span>
                    <span>Desplaza hacia abajo y toca <strong>"Agregar a pantalla de inicio"</strong>.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-info-100 text-info-700 flex items-center justify-center font-bold text-xs">4</span>
                    <span>Toca <strong>"Agregar"</strong> en la esquina superior derecha.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-info-100 text-info-700 flex items-center justify-center font-bold text-xs">5</span>
                    <span>La app aparecera en tu pantalla de inicio como cualquier otra app nativa.</span>
                  </li>
                </ol>
              </div>

              <div className="mt-8 p-4 bg-ink-50 rounded-xl text-sm text-ink-600 space-y-2">
                <p><strong>¿Que es una PWA?</strong></p>
                <p>Una Progressive Web App se comporta como una app nativa: se abre en pantalla completa, funciona sin barra de navegador y se instala directamente desde Safari. No necesitas descargar nada desde la App Store.</p>
              </div>

              <div className="mt-4 p-3 bg-warning-50 border border-warning-200 rounded-lg text-sm text-warning-700">
                <strong>Importante:</strong> Asegurate de usar <strong>Safari</strong> (no Chrome ni otros navegadores) ya que solo Safari soporta la funcion "Agregar a pantalla de inicio" en iPhone.
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <a href="/login" className="text-sm text-primary-600 hover:text-primary-800 font-medium">
            Volver al login
          </a>
        </div>
      </div>
    </div>
  );
}
