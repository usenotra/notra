export type JsonLdNode = Record<string, unknown>;

export interface ThemeColors {
  light: string;
  dark: string;
}

export interface SocialImage {
  url: string;
  large: boolean;
}

export interface ExtraMetaTag {
  key: "name" | "property";
  value: string;
  content: string;
}

export interface BaseLayoutProps {
  title: string;
  description?: string;
  image?: string;
  generatedImage?: string;
  type?: "website" | "article";
  noindex?: boolean;
  publishedTime?: Date;
  modifiedTime?: Date;
  tags?: string[];
  markdown?: string;
  jsonLd?: JsonLdNode[];
}
