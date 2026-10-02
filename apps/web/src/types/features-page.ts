export interface FeaturesPageCard {
  title: string;
  description: string;
}

export interface FeaturesPageSectionCopy {
  heading: string;
  subcopy: string;
}

export type FeaturesPageStudioVisual =
  | "activity"
  | "brandVoice"
  | "integrations"
  | "references";

export interface FeaturesPageStudioCard extends FeaturesPageCard {
  visual: FeaturesPageStudioVisual;
}
