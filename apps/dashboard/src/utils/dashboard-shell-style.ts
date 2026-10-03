import { DEMO_BANNER_HEIGHT } from "@/constants/demo";
import { EVE_BANNER_HEIGHT } from "@/constants/onboarding-agent";
import type { DashboardShellStyle } from "@/types/components/dashboard-shell";

/**
 * Everything below the top banners offsets by `--eve-banner-height`; the demo
 * bar stacks above the onboarding banner when it is shown.
 */
export function dashboardShellStyle(
  demoBanner: boolean,
  eveBanner: boolean
): DashboardShellStyle {
  const eveBannerHeight = eveBanner ? EVE_BANNER_HEIGHT : "0rem";
  if (!demoBanner) {
    return { "--eve-banner-height": eveBannerHeight };
  }
  return {
    "--eve-banner-height": `calc(${DEMO_BANNER_HEIGHT} + ${eveBannerHeight})`,
    "--demo-banner-height": DEMO_BANNER_HEIGHT,
  };
}
