import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

const SENTRY_DSN =
  (Constants.expoConfig?.extra as { sentryDsn?: string } | undefined)
    ?.sentryDsn ?? "";

export function initSentry(): boolean {
  if (!SENTRY_DSN) {
    console.warn("[Sentry] DSN no configurado, deshabilitado");
    return false;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment:
      (Constants.expoConfig?.extra as { environment?: string } | undefined)
        ?.environment ?? "development",
    tracesSampleRate: 1.0,
    enableAutoPerformanceTracing: true,
  });

  console.log("[Sentry] Inicializado");
  return true;
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  if (!SENTRY_DSN) return;
  Sentry.captureException(error, { extra: context });
}

export function captureMessage(
  message: string,
  level: "fatal" | "error" | "warning" | "log" | "info" | "debug" = "info",
) {
  if (!SENTRY_DSN) return;
  Sentry.captureMessage(message, level);
}
