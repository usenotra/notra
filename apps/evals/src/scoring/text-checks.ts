/** Deterministic checks for generated content. */

const DASH_REGEX = /[–—]/g;

/** Phrases the unslop skill tells writers to remove (subset that is easy to match). */
const SLOP_PATTERNS: readonly RegExp[] = [
  /\bdelv(e|es|ing)\b/i,
  /\bseamless(ly)?\b/i,
  /\bleverag(e|es|ing)\b/i,
  /\brobust\b/i,
  /\bgame[- ]chang(er|ing)\b/i,
  /\bunlock(s|ing)?\b/i,
  /\belevat(e|es|ing)\b/i,
  /\bempower(s|ing)?\b/i,
  /\bsupercharg(e|es|ing)\b/i,
  /\brevolutioni[sz](e|es|ing)\b/i,
  /\bcutting[- ]edge\b/i,
  /\bin today'?s (fast[- ]paced|digital|ever[- ]changing)\b/i,
  /\b(we'?re|we are) (thrilled|excited|delighted) to\b/i,
  /\bnot (just|only) [^.]{1,60}, but\b/i,
  /\bit'?s not [^.]{1,40}, it'?s\b/i,
  /\btake (it|things) to the next level\b/i,
  /\btapestry\b/i,
  /\btestament to\b/i,
  /\bboast(s|ing)?\b/i,
  /\bstreamlin(e|es|ed|ing)\b/i,
  /\bharness(es|ing)? the power\b/i,
  /\bnavigat(e|ing) the (complexities|landscape)\b/i,
];

export function countDashes(text: string): number {
  return text.match(DASH_REGEX)?.length ?? 0;
}

export function slopHits(text: string): string[] {
  const hits: string[] = [];
  for (const pattern of SLOP_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      hits.push(match[0]);
    }
  }
  return hits;
}

const GERMAN_MARKERS =
  /\b(und|der|die|das|nicht|mit|für|ist|wir|ihr|du|dein|euch|jetzt|auch|wird|werden|bei|auf|eine?n?)\b/gi;
const ENGLISH_MARKERS =
  /\b(and|the|with|for|is|we|you|your|now|also|will|this|that|are|our)\b/gi;

/** Share of German function words among German + English ones. */
export function germanShare(text: string): number {
  const german = text.match(GERMAN_MARKERS)?.length ?? 0;
  const english = text.match(ENGLISH_MARKERS)?.length ?? 0;
  return german + english === 0 ? 0 : german / (german + english);
}

export function plainLength(markdown: string): number {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*_`>]/g, "")
    .trim().length;
}
