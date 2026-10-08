export interface ResolvedBanner {
  html: string;
  dismissible: boolean;
  storageKey: string;
  light: string;
  dark: string;
  foreground: string;
}

export interface BannerProps {
  banner: ResolvedBanner;
}
