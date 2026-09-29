export type LandingPreview = "ai-overview" | "tooltip";

export interface LandingComponentLink {
  description: string;
  href: string;
  preview?: LandingPreview;
  title: string;
}

export interface LandingSection {
  description: string;
  items: LandingComponentLink[];
  title: string;
}

export interface LandingInstallCommand {
  item: string;
  prefix: string;
}

export interface LandingHero {
  description: string;
  install: LandingInstallCommand;
}
