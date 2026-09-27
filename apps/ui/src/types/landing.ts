export type LandingPreview = "ai-overview" | "tooltip";

export interface LandingComponentLink {
  description: string;
  href: string;
  preview?: LandingPreview;
  title: string;
}

export interface LandingSection {
  items: LandingComponentLink[];
  title: string;
}
