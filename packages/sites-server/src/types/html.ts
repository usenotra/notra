export type HtmlToken =
  | { kind: "open"; name: string; attrs: Map<string, string>; void: boolean }
  | { kind: "close"; name: string }
  | { kind: "text"; text: string };
