import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { api } from "@/lib/api";
import { useAuthStore, selectIsAuthenticated } from "@/stores/authStore";

type WebPushStatus =
  | "loading"
  | "unsupported"
  | "disabled"
  | "needs-permission"
  | "denied"
  | "ios-install"
  | "subscribed"
  | "error";

interface WebPushConfig {
  enabled: boolean;
  publicKey?: string;
  subject?: string;
  reason?: string;
}

const VAPID_STORAGE_KEY = "medicontrol_webpush_vapid";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function isIos(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandalonePwa(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function supported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function useWebPush() {
  const isAuthed = useAuthStore(selectIsAuthenticated);
  const [status, setStatus] = useState<WebPushStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const syncSubscription = useCallback(async (subscription: PushSubscription) => {
    const json = subscription.toJSON();
    await api.post("/notifications/web-push/subscribe", {
      endpoint: subscription.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      userAgent: navigator.userAgent,
    });
  }, []);

  const subscribeWithConfig = useCallback(
    async (config: WebPushConfig) => {
      if (!config.publicKey) throw new Error("Falta la llave publica VAPID");
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      const storedKey = localStorage.getItem(VAPID_STORAGE_KEY);

      if (subscription && storedKey && storedKey !== config.publicKey) {
        await subscription.unsubscribe();
        subscription = null;
      }

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(config.publicKey),
        });
      }

      localStorage.setItem(VAPID_STORAGE_KEY, config.publicKey);
      await syncSubscription(subscription);
    },
    [syncSubscription],
  );

  const refresh = useCallback(async () => {
    if (!isAuthed || Capacitor.isNativePlatform()) return;

    if (!supported()) {
      setStatus("unsupported");
      return;
    }

    try {
      setStatus("loading");
      setError(null);
      await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);

      const { data } = await api.get<WebPushConfig>("/notifications/web-push-config");
      if (!data.enabled || !data.publicKey) {
        setStatus("disabled");
        return;
      }

      if (isIos() && !isStandalonePwa()) {
        setStatus("ios-install");
        return;
      }

      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }

      if (Notification.permission === "default") {
        setStatus("needs-permission");
        return;
      }

      await subscribeWithConfig(data);
      setStatus("subscribed");
    } catch (err) {
      console.error("Web Push setup failed:", err);
      setError(err instanceof Error ? err.message : "No se pudo configurar Web Push");
      setStatus("error");
    }
  }, [isAuthed, subscribeWithConfig]);

  useEffect(() => {
    if (!isAuthed || Capacitor.isNativePlatform()) return;
    void refresh();
  }, [isAuthed, refresh]);

  const enable = useCallback(async () => {
    if (working) return;
    setWorking(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "needs-permission");
        return;
      }

      const { data } = await api.get<WebPushConfig>("/notifications/web-push-config");
      if (!data.enabled || !data.publicKey) {
        setStatus("disabled");
        return;
      }

      await subscribeWithConfig(data);
      setStatus("subscribed");
    } catch (err) {
      console.error("Web Push subscribe failed:", err);
      setError(err instanceof Error ? err.message : "No se pudo activar Web Push");
      setStatus("error");
    } finally {
      setWorking(false);
    }
  }, [subscribeWithConfig, working]);

  return { status, error, working, enable, refresh };
}
