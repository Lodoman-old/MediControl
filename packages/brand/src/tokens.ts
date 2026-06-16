export const colors = {
  primary: {
    50:  "#E8F7EE",
    100: "#C9ECD6",
    200: "#9CDCB5",
    300: "#6FCB93",
    400: "#43BB76",
    500: "#22A45D",
    600: "#1B8A4C",
    700: "#15703D",
    800: "#0F562E",
    900: "#093D20",
  },
  ink: {
    50:  "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },
  surface:    "#FFFFFF",
  surfaceAlt: "#F8FAFC",
  danger:  { 500: "#DC2626", 600: "#B91C1C", 50: "#FEE2E2" },
  warning: { 500: "#F59E0B", 600: "#D97706", 50: "#FEF3C7" },
  info:    { 500: "#2563EB", 600: "#1D4ED8", 50: "#DBEAFE" },
  success: { 500: "#16A34A", 600: "#15803D", 50: "#DCFCE7" },
} as const;

export const typography = {
  fontFamily: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
  },
  fontSize: {
    xs:   "0.75rem",
    sm:   "0.875rem",
    base: "1rem",
    lg:   "1.125rem",
    xl:   "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
  },
} as const;

export const radius = {
  none: "0",
  sm:   "0.25rem",
  md:   "0.5rem",
  lg:   "0.75rem",
  xl:   "1rem",
  full: "9999px",
} as const;

export const spacing = {
  xs:  "0.25rem",
  sm:  "0.5rem",
  md:  "1rem",
  lg:  "1.5rem",
  xl:  "2rem",
  "2xl": "3rem",
} as const;

export const shadow = {
  sm: "0 1px 2px rgba(15, 23, 42, 0.06)",
  md: "0 4px 6px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.04)",
  lg: "0 10px 15px rgba(15, 23, 42, 0.10), 0 4px 6px rgba(15, 23, 42, 0.04)",
} as const;

export const brandName = "MediControl" as const;
export const brandTagline = "Gestion clinica que crece contigo" as const;

export type Tokens = {
  colors: typeof colors;
  typography: typeof typography;
  radius: typeof radius;
  spacing: typeof spacing;
  shadow: typeof shadow;
};
