const URL_REGEX = /\/+$/;

function normalizeUrl(url: string): string {
  return url.replace(URL_REGEX, "");
}

export const EMAIL_CONFIG = {
  /**
   * Site URL for marketing site (logo, assets, etc.)
   * Falls back to production URL if not set
   */
  getSiteUrl(): string {
    return normalizeUrl(
      process.env.NEXT_PUBLIC_SITE_URL || "https://usenotra.com"
    );
  },

  /**
   * App/Dashboard URL for the Dashboard application
   * Falls back to production URL if not set
   */
  getAppUrl(): string {
    return normalizeUrl(
      process.env.NEXT_PUBLIC_APP_URL || "https://app.usenotra.com"
    );
  },

  /**
   * Get the email-safe PNG icon URL (uses site URL)
   */
  getLogoUrl(): string {
    const siteUrl = this.getSiteUrl();
    return `${siteUrl}/web-app-manifest-192x192.png`;
  },

  /**
   * Reply-to email address
   */
  replyTo: "support@usenotra.com",

  /**
   * Physical mailing address (matches Legal Notice / CAN-SPAM).
   */
  physicalAddress: {
    name: "Notra, Inc.",
    street: "2261 Market Street STE 98632",
    locality: "San Francisco, CA 94114",
    country: "United States",
  },
} as const;
