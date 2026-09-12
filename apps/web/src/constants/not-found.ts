import type { NotFoundDitheringConfig, NotFoundLink } from "@/types/not-found";
import { DOCS_URL, SITE_URL } from "@/utils/urls";

export const MARKDOWN_CACHE_CONTROL = "public, max-age=300";

export const NOT_FOUND_HEADING = "404";
export const NOT_FOUND_MESSAGE = "This page doesn't exist yet.";
export const NOT_FOUND_HOME_LABEL = "Back to home";

const NOT_FOUND_INDEX_PROMPT = "Looking for an index?";

const NOT_FOUND_AGENT_LINKS: NotFoundLink[] = [
  { label: "llms.txt", href: `${SITE_URL}/llms.txt` },
  { label: "sitemap.xml", href: `${SITE_URL}/sitemap.xml` },
  { label: "Docs", href: DOCS_URL },
];

const notFoundIndexMarkdown = NOT_FOUND_AGENT_LINKS.map(
  (link) => `[${link.label}](${link.href})`
).join(" · ");

export const NOT_FOUND_DITHERING: NotFoundDitheringConfig = {
  speed: 0.4,
  shape: "wave",
  type: "4x4",
  size: 5,
  scale: 0.55,
  colorBack: "#00000000",
  colorFront: "#8B5CF6A6",
  fit: "cover",
  hover: {
    offsetRange: 0.08,
    lerp: 0.08,
    visibleYRatio: 0.5,
  },
};

export const NOT_FOUND_MARKDOWN = `# 404 Not Found

There is no page at this URL on ${new URL(SITE_URL).hostname}.

[${NOT_FOUND_HOME_LABEL}](${SITE_URL}/)

${NOT_FOUND_INDEX_PROMPT} ${notFoundIndexMarkdown}

Markdown versions of pages are served with \`Accept: text/markdown\` or by appending \`.md\` to the path.
`;
