import { assetHeroSchema } from "../schemas/hero";
import type { AssetHero } from "../types/hero";

export const ASSET_HERO = assetHeroSchema.parse({
  title: "Turn shipped work into",
  accent: "marketing visuals",
  description:
    "Notra reads the PR, understands your brand, and generates editable marketing images your team can paste straight into Paper or Figma.",
  primaryCta: "Start for free",
  secondaryCta: "See the workflow",
  videos: [
    {
      src: "/marketing/marketing-assets-loop.mp4",
      poster: "/marketing/marketing-assets-loop-poster.jpg",
      label:
        "Notra generating a marketing visual from a merged PR and copying it for Paper",
    },
    {
      src: "/marketing/marketing-paper-loop.mp4",
      poster: "/marketing/marketing-paper-loop-poster.jpg",
      label:
        "A generated image pasted into Paper, unpacking into editable layers",
    },
    {
      src: "/marketing/marketing-edit-loop.mp4",
      poster: "/marketing/marketing-edit-loop-poster.jpg",
      label:
        "Editing the headline of a generated image directly on the Paper canvas",
    },
  ],
}) satisfies AssetHero;
