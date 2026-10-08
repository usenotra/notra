export const SCRIPT_ELEMENT = /<script\b([^>]*)>([\s\S]*?)<\/script\b[^>]*>/gi;
export const SRC_ATTRIBUTE = /(?:^|\s)src\s*=/i;
export const TYPE_ATTRIBUTE =
  /(?:^|\s)type\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i;
export const EXECUTABLE_SCRIPT_TYPES = new Set([
  "",
  "module",
  "text/javascript",
  "application/javascript",
]);
