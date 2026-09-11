import { AUTH_SIGNUP_URL } from "@/constants/auth";
import {
  CTA_BANNER_CONTACT_HREF,
  CTA_BANNER_HEADING,
  CTA_BANNER_PRIMARY_LABEL,
  CTA_BANNER_SECONDARY_LABEL,
  CTA_BANNER_SUBCOPY,
} from "@/constants/landing/cta-banner";
import { markdownSection } from "@/utils/markdown";
import { SITE_URL } from "@/utils/urls";

export function buildCtaBannerMarkdown() {
  return markdownSection(CTA_BANNER_HEADING, [
    CTA_BANNER_SUBCOPY,
    "",
    `[${CTA_BANNER_PRIMARY_LABEL}](${AUTH_SIGNUP_URL})`,
    "",
    `[${CTA_BANNER_SECONDARY_LABEL}](${new URL(CTA_BANNER_CONTACT_HREF, SITE_URL).href})`,
  ]);
}
