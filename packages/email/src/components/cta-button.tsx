import type { ComponentProps } from "react";
import { Button as ReactEmailButton } from "react-email";

import { EMAIL_THEME } from "../constants/theme";

type EmailCtaButtonProps = ComponentProps<typeof ReactEmailButton>;

/** Email twin of `@notra/ui` `CtaButton` (`cta-gradient-primary`, pill). */
export const EmailCtaButton = ({
  children,
  style,
  ...props
}: EmailCtaButtonProps) => (
  <ReactEmailButton
    {...props}
    style={{
      // Outlook drops the gradient; the fallback still has to pass contrast.
      backgroundColor: EMAIL_THEME.primaryAccessible,
      backgroundImage: `linear-gradient(180deg, ${EMAIL_THEME.ctaFrom} 0%, ${EMAIL_THEME.ctaTo} 100%)`,
      borderRadius: "9999px",
      boxShadow: `0 0 0 8px ${EMAIL_THEME.ctaGlow}, 0 1px 2px #28282814, 0 0 0 1px #1E1E1E40`,
      color: EMAIL_THEME.background,
      display: "inline-block",
      fontSize: "16px",
      fontWeight: 500,
      letterSpacing: "-0.015em",
      lineHeight: "20px",
      padding: "12px 24px",
      textAlign: "center",
      textDecoration: "none",
      ...style,
    }}
  >
    {children}
  </ReactEmailButton>
);
