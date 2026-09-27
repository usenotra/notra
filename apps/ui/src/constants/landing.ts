import type { LandingComponentLink, LandingPrinciple } from "../types/landing";

export const LANDING_PRINCIPLES: LandingPrinciple[] = [
  {
    body: "The same tokens, radii and type scale the Notra dashboard ships with.",
    title: "Straight from the product",
  },
  {
    body: "Every component reads the theme tokens, so both modes work without extra code.",
    title: "Light and dark",
  },
  {
    body: "Focus opens what hover opens, and every surface keeps its semantic role.",
    title: "Keyboard first",
  },
];

export const LANDING_COMPONENTS: LandingComponentLink[] = [
  {
    description: "A muted header band tucked behind the content card.",
    href: "/components/tooltip",
    preview: "tooltip",
    title: "Tooltip",
  },
];
