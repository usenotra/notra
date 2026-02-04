export const EMAIL_CONFIG = {
  /**
   * Site URL for marketing site (logo, assets, etc.)
   * Falls back to production URL if not set
   */
  getSiteUrl(): string {
    return process.env.NEXT_PUBLIC_SITE_URL || "https://usenotra.com";
  },

  /**
   * App/Dashboard URL for the Dashboard application
   * Falls back to production URL if not set
   */
  getAppUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL || "https://app.usenotra.com";
  },

  /**
   * Get logo URL with fallback (uses site URL)
   */
  getLogoUrl(): string {
    const siteUrl = this.getSiteUrl();
    return `${siteUrl}/favicon.svg`;
  },

  /**
   * Reply-to email address
   */
  replyTo: "support@usenotra.com",

  /**
   * From email address
   */
  from: "Notra <notifications@usenotra.com>",

  /**
   * Physical mailing address for CAN-SPAM compliance
   */
  physicalAddress: {
    name: "Dominik Koch - c/o IP-Management #8532",
    street: "Ludwig-Erhard-Str. 18",
    city: "Hamburg",
    zip: "20459",
    country: "Germany",
  },
} as const;
