import { BLOG_CARD_DITHER_RANGES } from "@/constants/dithering";

function seededValue(seed: string, range: readonly [number, number]) {
  let hash = 0;
  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) % 4_294_967_296;
  }
  const fraction = hash / 4_294_967_296;
  return range[0] + fraction * (range[1] - range[0]);
}

export function getBlogCardDither(slug: string) {
  return {
    frame: seededValue(`frame:${slug}`, BLOG_CARD_DITHER_RANGES.frame),
    scale: seededValue(`scale:${slug}`, BLOG_CARD_DITHER_RANGES.scale),
    speed: seededValue(`speed:${slug}`, BLOG_CARD_DITHER_RANGES.speed),
  };
}
