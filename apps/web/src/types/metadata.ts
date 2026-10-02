export interface MetadataImage {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
  type?: string;
}

export type MetadataTitle =
  | string
  | { absolute: string }
  | { default: string; template: string };

interface MetadataAlternates {
  canonical?: string;
  types?: Record<string, string>;
}

interface MetadataRobots {
  index?: boolean;
  follow?: boolean;
}

interface MetadataOpenGraph {
  type?: string;
  locale?: string;
  url?: string;
  siteName?: string;
  title?: string;
  description?: string;
  images?: readonly (string | MetadataImage)[];
  publishedTime?: string;
  modifiedTime?: string;
  authors?: readonly string[];
}

interface MetadataTwitter {
  card?: string;
  title?: string;
  description?: string;
  images?: readonly (string | MetadataImage)[];
  site?: string;
  creator?: string;
}

interface MetadataIcon {
  url: string;
  sizes?: string;
  type?: string;
}

export interface Metadata {
  title?: MetadataTitle;
  description?: string;
  keywords?: readonly string[];
  category?: string;
  creator?: string;
  alternates?: MetadataAlternates;
  robots?: MetadataRobots;
  openGraph?: MetadataOpenGraph;
  twitter?: MetadataTwitter;
  icons?: { icon?: MetadataIcon[]; apple?: MetadataIcon[] };
  other?: Record<string, string>;
}

export interface HeadMeta {
  title?: string;
  name?: string;
  property?: string;
  content?: string;
  charSet?: string;
  media?: string;
}

export interface HeadLink {
  rel: string;
  href: string;
  type?: string;
  sizes?: string;
  title?: string;
}

export interface Head {
  meta: HeadMeta[];
  links: HeadLink[];
}
