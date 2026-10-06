import { assetShowcaseSectionsSchema } from "../schemas/showcase";
import type { AssetShowcaseSection } from "../types/showcase";

export const ASSET_GENERATE_SECTION_ID = "generate";

export const ASSET_SHOWCASE_SECTIONS = assetShowcaseSectionsSchema.parse([
  {
    id: ASSET_GENERATE_SECTION_ID,
    headingPre: "If it looks generic, ",
    headingAccent: "nobody",
    headingPost: " clicks.",
    paragraphs: [
      "Notra fetches your site for brand identity, scans your repo for real UI and builds a marketing visual from your own product.",
      "When it's done, one click copies it for Paper or Figma without exporting files.",
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
      "Hit paste in Paper or Figma and the visual lands on the canvas as organized, editable layers. Frames, text and shapes keep the structure a designer would build by hand.",
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
      "Found a typo in the headline? Select it and type. Every word stays a live text layer, so you never regenerate the image or rebuild the layout.",
    ],
    videoSrc: "/marketing/marketing-edit-loop.mp4",
    posterSrc: "/marketing/marketing-edit-loop-poster.jpg",
    videoLabel:
      "Editing the headline of a generated image directly on the Paper canvas",
    mediaSide: "right",
  },
]) satisfies AssetShowcaseSection[];
