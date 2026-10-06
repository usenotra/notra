export type JsonLdNode = Record<string, unknown>;

export interface SocialImage {
  url: string;
  large: boolean;
}

export interface ExtraMetaTag {
  key: "name" | "property";
  value: string;
  content: string;
}
