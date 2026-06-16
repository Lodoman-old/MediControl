export * from "./tokens";

/**
 * Identificadores logicos de los logos.
 *
 * Cada app resuelve estos identificadores a sus propios assets locales
 * (en web via `/public`, en movil via `require('./assets/...')`) para
 * evitar dependencias cruzadas entre paquetes.
 */
export const logoIds = {
  isopo: "isopo",
  horizontal: "logo-horizontal",
  favicon: "favicon",
} as const;

export type LogoId = (typeof logoIds)[keyof typeof logoIds];
