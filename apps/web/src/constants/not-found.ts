import type { NotFoundDitheringConfig } from "@/types/not-found";
import { DOCS_URL, SITE_URL } from "@/utils/urls";

export const MARKDOWN_CACHE_CONTROL = "public, max-age=300";

export const NOT_FOUND_HEADING = "404";
export const NOT_FOUND_MESSAGE = "This page doesn't exist yet.";
export const NOT_FOUND_HOME_LABEL = "Back to home";

export const NOT_FOUND_DITHERING: NotFoundDitheringConfig = {
  speed: 0.4,
  shape: "wave",
  type: "4x4",
  size: 5,
  scale: 0.68,
  colorBack: "#00000000",
  colorFront: "#8B5CF6",
  fit: "cover",
  hover: {
    offsetRange: 0.08,
    lerp: 0.08,
    visibleYRatio: 0.5,
  },
};

export const NOT_FOUND_MARKDOWN = `# 404 Not Found

There is no page at this URL on ${new URL(SITE_URL).hostname}.

Start from one of these instead:

- [Site index for agents](${SITE_URL}/llms.txt)
- [Full site context](${SITE_URL}/llms-full.txt)
- [Sitemap](${SITE_URL}/sitemap.xml)
- [Documentation](${DOCS_URL})

Markdown versions of pages are served with \`Accept: text/markdown\` or by appending \`.md\` to the path.
`;
