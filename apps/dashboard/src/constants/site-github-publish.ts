import type { GitHubPublishContentType } from "@/types/integrations/github";

export const SITE_ENTRY_DIRECTORIES = {
  blog_post: "blog",
  changelog: "changelog",
} as const satisfies Record<GitHubPublishContentType, string>;

export const SITE_PUBLIC_DIRECTORY = "public";
export const SITE_IMAGE_DIRECTORY = "images";

export const SITE_ENTRY_DESCRIPTION_MAX_LENGTH = 160;

export const SITE_ENTRY_FALLBACK_SLUG = "post";

export const FRONTMATTER_BLOCK = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
export const FRONTMATTER_TITLE_KEY = /^title[ \t]*:/m;
export const FRONTMATTER_DATE_KEY = /^date[ \t]*:/m;
export const FRONTMATTER_AUTHOR_LINE = /^author[ \t]*:[ \t]*(.*)$/m;
export const UNQUOTED_YAML_COMMENT = /\s+#.*$/;
export const LEADING_BLANK_LINES = /^(?:[ \t]*\r?\n)+/;
export const LEADING_ATX_HEADING =
  /^[ \t]{0,3}#[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*(?:\r?\n|$)/;
export const WHITESPACE_RUN = /\s+/g;
export const TRAILING_PUNCTUATION = /[\s,;:.\-–—]+$/;
export const SURROUNDING_SLASHES = /^\/+|\/+$/g;
export const SITE_IMAGE_URL = /^(?:https:\/\/|\/(?!\/))/;
export const ELLIPSIS = "…";
