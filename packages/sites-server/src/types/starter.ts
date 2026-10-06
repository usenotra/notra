import type { SITE_SOCIAL_PLATFORMS } from "@notra/sites-core/constants/site-layout";

import type { SiteRepository } from "./github";

export type StarterSocialPlatform = (typeof SITE_SOCIAL_PLATFORMS)[number];

export interface StarterLink {
  label: string;
  href: string;
}

export interface LandingPageFacts {
  title: string | null;
  siteName: string | null;
  description: string | null;
  headerLogoUrl: string | null;
  iconUrl: string | null;
  themeColor: string | null;
  fontFamilies: string[];
  navLinks: StarterLink[];
  cta: StarterLink | null;
  footerLinks: StarterLink[];
  socials: Partial<Record<StarterSocialPlatform, string>>;
}

export interface StarterBrandLogo {
  light: string;
  dark: string | null;
  wordmark: boolean;
}

export interface StarterBrandInput {
  name: string;
  description: string | null;
  websiteUrl: string | null;
  logo: StarterBrandLogo | null;
  colors: {
    primary: string | null;
    primaryDark: string | null;
  };
  fonts: { heading: string | null; body: string | null };
  landing: LandingPageFacts | null;
}

export interface StarterFile {
  path: string;
  content: string;
}

export interface SiteStarterFiles {
  files: StarterFile[];
}

export interface SiteStarterScope {
  organizationId: string;
  repositoryId: string;
  branch: string;
  rootDirectory: string;
}

export interface StarterTarget {
  repository: SiteRepository;
  token: string;
  branch: string;
  rootDirectory: string;
}

export interface SiteStarterStatus {
  hasConfig: boolean;
  pullRequestUrl: string | null;
}

export interface SiteStarterResult {
  pullRequestUrl: string;
  created: boolean;
}

export interface ResolveLinkUrlOptions {
  httpsOnly?: boolean;
}

export interface LandingPageFrame {
  name: string;
  hidden: boolean;
}

export interface CapturedAnchor {
  href: string;
  label: string;
  hidden: boolean;
  menuItem: boolean;
  inHeader: boolean;
  inNav: boolean;
  footerIndex: number | null;
}

export type OpenAnchor = Omit<CapturedAnchor, "label"> & {
  ariaLabel: string;
  text: string[];
  svgTitle: string[];
};

export interface IconCandidate {
  href: string;
  rel: string;
  type: string;
  size: number;
}
