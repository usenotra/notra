/**
 * Hex twins of the light theme in `packages/ui/src/styles/globals.css`
 * and GEO status in `packages/ui/src/styles/status.css`. Email clients do
 * not resolve oklch / CSS variables, so these stay literal.
 */
export const EMAIL_THEME = {
  background: "#FFFFFF",
  foreground: "#171717",
  muted: "#F5F5F5",
  mutedForeground: "#737373",
  border: "#E5E5E5",
  primary: "#8B5CF6",
  radius: "8px",
  geoUp: "#328455",
  geoUpWash: "#EAF3EE",
  geoDown: "#D83E38",
  geoDownWash: "#FBECEB",
  /** Hex twins of `cta-gradient-primary` in `packages/ui/src/styles/cta-button.css`. */
  ctaFrom: "#A385FF",
  ctaTo: "#7C00FF",
  ctaGlow: "#8B5CF640",
  /**
   * Darker than `primary` so white button labels (5.7:1) and links (7:1) pass
   * WCAG AA, which the UI's #8B5CF6 does not on white.
   */
  primaryAccessible: "#7C3AED",
  link: "#6D28D9",
  /** `mutedForeground` fails AA on the `muted` wash; use this for small text. */
  subtleForeground: "#595959",
  /** Pill text on the geo washes; the UI tones are under 4.5:1 there. */
  geoUpText: "#2A7048",
  geoDownText: "#B4322D",
  /**
   * Explicit system stack: Outlook on Windows falls back to Times New Roman
   * when the first families (Tailwind's `ui-sans-serif`) are unknown.
   */
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
} as const;
