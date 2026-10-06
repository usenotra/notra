export const BLOCKED_HTML_ELEMENTS: ReadonlySet<string> = new Set(["script"]);

export const BLOCKED_ELEMENT_HINT =
  "is not allowed in content. Put JavaScript in script.js or scripts/*.js.";

export const HTML_OPENING_TAG = /<\s*([a-z][a-z0-9-]*)/gi;
