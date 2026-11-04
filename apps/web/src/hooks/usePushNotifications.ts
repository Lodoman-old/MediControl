import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { registerDeviceToken } from "@/lib/api";
import { useAuthStore, selectIsAuthenticated } from "@/stores/authStore";

export function usePushNotifications() {
  const registered = useRef(false);
  const isAuthed = useAuthStore(selectIsAuthenticated);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!isAuthed) return;
    if (registered.current) return;
    registered.current = true;

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
