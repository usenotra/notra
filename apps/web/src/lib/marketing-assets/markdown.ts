import { AUTH_SIGNUP_URL } from "@/constants/auth";
import { ASSET_HERO } from "@/lib/marketing-assets/constants/hero";
import { ASSET_SHOWCASE_SECTIONS } from "@/lib/marketing-assets/constants/showcase";
import { getAssetShowcaseTitle } from "@/lib/marketing-assets/utils/showcase";
import { buildCtaBannerMarkdown } from "@/utils/cta-banner-markdown";
import { markdownSection } from "@/utils/markdown";
import { SITE_URL } from "@/utils/urls";

export function buildMarketingAssetsMarkdown() {
  const sections = ASSET_SHOWCASE_SECTIONS.map((section) =>
    markdownSection(getAssetShowcaseTitle(section), [
      ...section.paragraphs.flatMap((paragraph) => [paragraph, ""]),
      ...(section.id === "generate"
        ? ["Paste-ready for Paper or Figma.", ""]
        : []),
      `Video: ${section.videoLabel}.`,
    ])
  );

  return [
    `# ${ASSET_HERO.title} ${ASSET_HERO.accent}`,
    "",
    ASSET_HERO.description,
    "",
    `[${ASSET_HERO.primaryCta}](${AUTH_SIGNUP_URL})`,
    "",
    ...sections,
    buildCtaBannerMarkdown(),
    markdownSection("Related", [
      `- [Features](${SITE_URL}/features.md)`,
      `- [HTML to Figma](${SITE_URL}/html-to-figma.md)`,
      `- [HTML to Paper](${SITE_URL}/html-to-paper.md)`,
    ]),
  ].join("\n");
}
