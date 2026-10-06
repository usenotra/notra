import { Img, Link, Section } from "react-email";

import { EMAIL_THEME } from "../constants/theme";
import { EMAIL_CONFIG } from "../utils/config";

type EmailLogoVariant = "mark" | "lockup";

const MARK_SIZE = 64;
const LOCKUP_MARK_SIZE = 28;

/**
 * `lockup` pairs the app icon with "Notra" as live text. A transparent
 * wordmark image would vanish in Outlook's dark mode, which inverts text and
 * backgrounds but not images; the icon brings its own light tile.
 */
export const EmailLogo = ({
  className = "mt-[32px] text-center",
  variant = "mark",
}: {
  className?: string;
  variant?: EmailLogoVariant;
} = {}) => {
  if (variant === "mark") {
    return (
      <Section className={className}>
        <Link href={EMAIL_CONFIG.getSiteUrl()}>
          <Img
            alt="Notra"
            className="mx-auto"
            height={MARK_SIZE}
            src={EMAIL_CONFIG.getLogoUrl()}
            style={{ borderRadius: "14px" }}
            width={MARK_SIZE}
          />
        </Link>
      </Section>
    );
  }

  return (
    <Section className={className}>
      <table
        align="center"
        border={0}
        cellPadding={0}
        cellSpacing={0}
        role="presentation"
      >
        <tbody>
          <tr>
            <td style={{ paddingRight: "8px", verticalAlign: "middle" }}>
              {/* Decorative: the "Notra" link next to it names the brand. */}
              <Img
                alt=""
                height={LOCKUP_MARK_SIZE}
                src={EMAIL_CONFIG.getLogoUrl()}
                style={{ borderRadius: "7px", display: "block" }}
                width={LOCKUP_MARK_SIZE}
              />
            </td>
            <td style={{ verticalAlign: "middle" }}>
              <Link
                href={EMAIL_CONFIG.getSiteUrl()}
                style={{
                  color: EMAIL_THEME.foreground,
                  fontFamily: EMAIL_THEME.fontFamily,
                  fontSize: "20px",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  textDecoration: "none",
                }}
              >
                Notra
              </Link>
            </td>
          </tr>
        </tbody>
      </table>
    </Section>
  );
};
