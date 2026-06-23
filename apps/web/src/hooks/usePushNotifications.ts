import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { registerDeviceToken, unregisterDeviceToken } from "@/lib/api";
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
        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive !== "granted") return;

        await PushNotifications.register();

        PushNotifications.addListener("registration", async ({ value }) => {
          const platform = Capacitor.getPlatform();
          await registerDeviceToken(value, platform);
        });

        PushNotifications.addListener("registrationError", ({ error }) => {
          console.error("Push registration error:", error);
        });

        PushNotifications.addListener("pushNotificationReceived", (notification) => {
          console.log("Push received:", notification);
        });

        PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          const data = action.notification.data;
          if (data?.appointmentId) {
            window.location.hash = `/appointments/${data.appointmentId}`;
          } else if (data?.type === "APPOINTMENT_PENDING_CONFIRMATION") {
            window.location.hash = "/appointments/pending";
          }
        });
      } catch (err) {
        console.error("Push notification setup failed:", err);
      }
    })();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [isAuthed]);
}
