import { OG_TITLE_SIZES } from "../constants/og-images";

export function titleSize(title: string): number {
  const step =
    OG_TITLE_SIZES.find((candidate) => title.length <= candidate.maxLength) ??
    OG_TITLE_SIZES[2];
  return step.size;
}
