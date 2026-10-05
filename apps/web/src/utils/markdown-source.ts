import { CONTENT_SOURCES } from "@/constants/content-sources";

export function readAppMarkdownSource(...segments: string[]) {
  const source = CONTENT_SOURCES[`/src/content/${segments.join("/")}`];

  if (source === undefined) {
    throw new Error(`Unable to load markdown source: ${segments.join("/")}`);
  }

  return source;
}
