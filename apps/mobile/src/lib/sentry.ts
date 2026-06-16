// Versión web (no-op). En native se usa sentry.native.ts
// Expo resuelve: sentry.native.ts > sentry.ts en iOS/Android
//                sentry.web.ts > sentry.ts en web

export function initSentry(): boolean {
  return false;
}

export function captureError(_error: Error, _context?: Record<string, unknown>) {}

export function captureMessage(_message: string, _level?: string) {}
