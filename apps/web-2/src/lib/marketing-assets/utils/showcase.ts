import type { AssetShowcaseSection } from "../types/showcase";

export function getAssetShowcaseDescription(section: AssetShowcaseSection) {
  return section.paragraphs[0];
}

export function getAssetShowcaseTitle(section: AssetShowcaseSection) {
  return `${section.headingPre}${section.headingAccent}${section.headingPost}`;
}
