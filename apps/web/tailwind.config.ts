import type { Config } from "tailwindcss";
import { colors, typography, radius, shadow } from "@medicontrol/brand";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        ink: colors.ink,
        danger: colors.danger,
        warning: colors.warning,
        info: colors.info,
        success: colors.success,
        surface: colors.surface,
        "surface-alt": colors.surfaceAlt,
      },
      fontFamily: {
        sans: typography.fontFamily.sans.split(","),
        mono: typography.fontFamily.mono.split(","),
      },
      borderRadius: {
        none: radius.none,
        sm: radius.sm,
        DEFAULT: radius.md,
        md: radius.md,
        lg: radius.lg,
        xl: radius.xl,
        full: radius.full,
      },
      boxShadow: {
        sm: shadow.sm,
        DEFAULT: shadow.md,
        md: shadow.md,
        lg: shadow.lg,
      },
    },
  },
  plugins: [],
};

export default config;
