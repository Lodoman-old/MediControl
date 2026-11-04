// En desarrollo se muestran siempre; en produccion solo si se activa
// explicitamente la variable correspondiente en el build.
export const showDemoAccounts =
  import.meta.env["DEV"] === true ||
  import.meta.env["VITE_SHOW_DEMO_ACCOUNTS"] === "true";

export const showDebugPanel =
  import.meta.env["DEV"] === true ||
  import.meta.env["VITE_SHOW_DEBUG_PANEL"] === "true";
