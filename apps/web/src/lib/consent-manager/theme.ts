import type { Theme } from "@c15t/react";

const smoothingSlot = {
  style: {
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
  },
} satisfies NonNullable<Theme["slots"]>["consentBanner"];

const colors = {
  primary: "var(--primary)",
  primaryHover: "var(--primary-hover)",
  surface: "var(--card)",
  surfaceHover: "var(--secondary)",
  border: "var(--border)",
  borderHover: "var(--ring)",
  text: "var(--foreground)",
  textMuted: "var(--muted-foreground)",
  textOnPrimary: "var(--primary-foreground)",
  overlay: "hsl(0 0% 0% / 0.5)",
  switchTrack: "var(--input)",
  switchTrackActive: "var(--primary)",
  switchThumb: "var(--card)",
};

const radius = {
  sm: "calc(0.625rem - 4px)",
  md: "calc(0.625rem - 2px)",
  lg: "0.625rem",
};

export const consentTheme = {
  colors,
  dark: colors,
  typography: {
    fontFamily: "var(--font-inter)",
  },
  radius,
  slots: {
    consentBanner: smoothingSlot,
    consentBannerCard: smoothingSlot,
    consentDialog: smoothingSlot,
    consentDialogCard: smoothingSlot,
  },
} satisfies Theme;
