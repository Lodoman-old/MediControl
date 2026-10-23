export const INTEGRATION_PROVIDERS = {
  WHATSAPP: {
    label: "WhatsApp Cloud API",
    description: "Envio de mensajes y recordatorios por WhatsApp.",
    fields: ["phoneNumberId", "apiToken"],
    secrets: ["apiToken"],
  },
  SMTP: {
    label: "Correo SMTP",
    description: "Envio de correos, recibos y resultados de laboratorio.",
    fields: ["host", "port", "secure", "user", "pass", "from"],
    secrets: ["pass"],
  },
  FIREBASE: {
    label: "Firebase Cloud Messaging",
    description: "Notificaciones push a la app movil.",
    fields: ["projectId", "clientEmail", "privateKey"],
    secrets: ["privateKey"],
  },
  MERCADOPAGO: {
    label: "MercadoPago",
    description: "Cobros en linea (requiere habilitar la funcion).",
    fields: ["publicKey", "accessToken"],
    secrets: ["accessToken"],
  },
} as const;

export type IntegrationProvider = keyof typeof INTEGRATION_PROVIDERS;

export const INTEGRATION_PROVIDER_KEYS = Object.keys(
  INTEGRATION_PROVIDERS,
) as IntegrationProvider[];

export function isIntegrationProvider(value: string): value is IntegrationProvider {
  return INTEGRATION_PROVIDER_KEYS.includes(value as IntegrationProvider);
}
