export const GITHUB_MENTION_CONTENT_POLICY_REASONS = {
  malformed: "cannot safely parse edited markup",
  module: "adds an MDX import or export",
  expression: "adds an MDX expression",
  script: "adds a script tag",
  embed: "adds an embedded frame or object",
  javascriptUrl: "adds an executable URL (javascript:, data:, or vbscript:)",
  eventHandler: "adds an inline event handler",
} as const;

export const GITHUB_MENTION_UNSAFE_HTML_ELEMENTS = new Set([
  "script",
  "iframe",
  "object",
  "embed",
  "animate",
  "animatemotion",
  "animatetransform",
  "set",
]);

export const GITHUB_MENTION_URL_ATTRIBUTES = new Set([
  "action",
  "background",
  "cite",
  "data",
  "formaction",
  "href",
  "longdesc",
  "poster",
  "src",
  "xlinkhref",
]);

export const GITHUB_MENTION_FINDING_SNIPPET_LENGTH = 120;
