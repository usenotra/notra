export const AREA_PAGES_FILE = "notra-pages.json";

export const ASTRO_LOG_NOISE: readonly RegExp[] = [
  /\[glob-loader\] No files found matching/,
  /\[glob-loader\] The base directory .* does not exist/,
  /\[content\] The collection "(?:blog|changelog)" does not exist or is empty/,
];
