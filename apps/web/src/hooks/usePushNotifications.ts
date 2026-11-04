import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { api, registerDeviceToken } from "@/lib/api";
import { RemoteFirebase, type RemoteFirebaseOptions } from "@/lib/remoteFirebase";
import { useAuthStore, selectIsAuthenticated } from "@/stores/authStore";

interface PushConfigResponse {
  enabled: boolean;
  config?: RemoteFirebaseOptions;
  reason?: string;
}

export function usePushNotifications() {
  const isAuthed = useAuthStore(selectIsAuthenticated);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!isAuthed) return;

    (async () => {
      try {
        await PushNotifications.addListener("registration", async ({ value }) => {
          try {
            const platform = Capacitor.getPlatform();
            await registerDeviceToken(value, platform);
          } catch (err) {
            console.error("Push token registration failed:", err);
          }
        });

        await PushNotifications.addListener("registrationError", ({ error }) => {
          console.error("Push registration error:", error);
        });

        await PushNotifications.addListener("pushNotificationReceived", (notification) => {
          console.log("Push received:", notification);
        });

        await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          const data = action.notification.data;
          if (data?.appointmentId) {
            window.location.hash = `/appointments/${data.appointmentId}`;
          } else if (data?.type === "APPOINTMENT_PENDING_CONFIRMATION") {
            window.location.hash = "/appointments/pending";
          }
        });

        const { data } = await api.get<PushConfigResponse>("/notifications/push-config");
        if (!data.enabled || !data.config) {
          console.warn("Push no configurado:", data.reason ?? "Firebase deshabilitado");
          return;
        }

        if (Capacitor.getPlatform() === "android") {
          try {
            await RemoteFirebase.configure(data.config);
          } catch (err) {
            // APK anterior sin el plugin nativo: se intenta el registro normal
            console.warn("No se pudo inicializar Firebase remoto:", err);
          }
        }

        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive !== "granted") {
          console.warn("Permiso de notificaciones no concedido");
          return;
        }

        await PushNotifications.register();
      } catch (err) {
        console.error("Push notification setup failed:", err);
      }
    })();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [isAuthed]);
}
