import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

export function initSentry(config: ConfigService): void {
  const dsn = config.get<string>("SENTRY_DSN");
  if (!dsn) {
    Logger.warn("SENTRY_DSN no configurado — Sentry deshabilitado", "SentryInit");
    return;
  }

  Sentry.init({
    dsn,
    environment: config.get<string>("NODE_ENV") ?? "development",
    tracesSampleRate: config.get<number>("SENTRY_TRACES_SAMPLE_RATE") ?? 0.1,
    profilesSampleRate: config.get<number>("SENTRY_PROFILES_SAMPLE_RATE") ?? 0.1,
    integrations: [nodeProfilingIntegration()],
    beforeSend(event) {
      if (event.exception) {
        Logger.warn(`Sentry capturando error: ${event.exception.values?.[0]?.value ?? "unknown"}`, "Sentry");
      }
      return event;
    },
  });

  Logger.log("Sentry inicializado", "SentryInit");
}
