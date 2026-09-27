export interface LandingPrinciple {
  body: string;
  title: string;
}

export type LandingPreview = "tooltip";

export interface LandingComponentLink {
  description: string;
  href: string;
  preview: LandingPreview;
  title: string;
}
