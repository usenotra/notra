import { assetShowcaseSectionsSchema } from "../schemas/showcase";
import type { AssetShowcaseSection } from "../types/showcase";

export const ASSET_SHOWCASE_SECTIONS = assetShowcaseSectionsSchema.parse([
  {
    id: "generate",
    headingPre: "If it looks generic, ",
    headingAccent: "nobody",
    headingPost: " clicks.",
    paragraphs: [
      "Screenshots get skipped and stock templates get scrolled past. Notra fetches your site for brand identity, scans your repo for real UI, and composes a marketing visual that actually looks like your product.",
      "When it's done, one click copies it for Paper or Figma. No exports, no file juggling.",
    ],
    videoSrc: "/marketing/marketing-assets-loop.mp4",
    posterSrc: "/marketing/marketing-assets-loop-poster.jpg",
    videoLabel:
      "Notra generating a marketing image from a merged PR and copying it for Paper",
    mediaSide: "right",
  },
  {
    id: "paste",
    headingPre: "Paste it where your ",
    headingAccent: "designers",
    headingPost: " live.",
    paragraphs: [
      "Hit paste in Paper or Figma and the visual lands on the canvas as organized, editable layers. Frames, text, and shapes arrive structured the way a designer would have built them by hand.",
    ],
    videoSrc: "/marketing/marketing-paper-loop.mp4",
    posterSrc: "/marketing/marketing-paper-loop-poster.jpg",
    videoLabel:
      "A generated image pasted into Paper, unpacking into editable layers",
    mediaSide: "left",
  },
  {
    id: "edit",
    headingPre: "It's real text. Just ",
    headingAccent: "retype",
    headingPost: " it.",
    paragraphs: [
      "Typo in the headline? Select it and type. No regenerating, no prompt roulette, no rebuilding the layout from scratch. Every word stays a live text layer.",
    ],
    videoSrc: "/marketing/marketing-edit-loop.mp4",
    posterSrc: "/marketing/marketing-edit-loop-poster.jpg",
    videoLabel:
      "Editing the headline of a generated image directly on the Paper canvas",
    mediaSide: "right",
  },
]) satisfies AssetShowcaseSection[];
