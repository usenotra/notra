export type ParsedSiteHost =
  | { kind: "alias"; slug: string }
  | { kind: "preview"; slug: string; previewKey: string }
  | { kind: "custom"; hostname: string };
