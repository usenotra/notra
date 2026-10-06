import type { CSSProperties, ReactNode } from "react";

import { EMAIL_THEME } from "../constants/theme";

/**
 * Email twin of `@notra/ui` `CtaButton` (`cta-gradient-primary`, pill).
 *
 * Built as a table so Outlook on Windows keeps it a button: Outlook ignores
 * padding on links and margins on tables, but honors cell `bgcolor`,
 * `mso-padding-alt` and cell padding. It drops the gradient and glow there and
 * shows the solid fallback.
 */
export const EmailCtaButton = ({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) => (
  <table
    border={0}
    cellPadding={0}
    cellSpacing={0}
    role="presentation"
    width="100%"
  >
    <tbody>
      <tr>
        <td align="center" style={{ padding: "32px 0" }}>
          <table border={0} cellPadding={0} cellSpacing={0} role="presentation">
            <tbody>
              <tr>
                <td
                  align="center"
                  // Legacy attribute Outlook reads; React's types omit it.
                  {...{ bgcolor: EMAIL_THEME.primaryAccessible }}
                  style={
                    {
                      backgroundColor: EMAIL_THEME.primaryAccessible,
                      backgroundImage: `linear-gradient(180deg, ${EMAIL_THEME.ctaFrom} 0%, ${EMAIL_THEME.ctaTo} 100%)`,
                      borderRadius: "9999px",
                      boxShadow: `0 0 0 8px ${EMAIL_THEME.ctaGlow}, 0 1px 2px #28282814, 0 0 0 1px #1E1E1E40`,
                      // Outlook-only property, so React's CSS types don't know it.
                      msoPaddingAlt: "12px 24px",
                    } as CSSProperties
                  }
                >
                  <a
                    href={href}
                    style={{
                      color: EMAIL_THEME.background,
                      display: "inline-block",
                      fontFamily: EMAIL_THEME.fontFamily,
                      fontSize: "16px",
                      fontWeight: 500,
                      letterSpacing: "-0.015em",
                      lineHeight: "20px",
                      padding: "12px 24px",
                      textDecoration: "none",
                    }}
                    target="_blank"
                  >
                    {children}
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>
);
