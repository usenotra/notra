// GitHub hides everything after an unterminated `<!--`, so that counts too.
const HTML_COMMENT_PATTERN = /<!--[\s\S]*?(?:-->|$)/g;

/**
 * One pass is not enough: removing the inner comment of
 * `<!-<!-- x -->- @notra -->` leaves a new comment behind. Repeat until
 * nothing changes.
 */
export function removeHtmlComments(value: string) {
  let current = value;
  let previous = "";
  while (current !== previous) {
    previous = current;
    current = current.replace(HTML_COMMENT_PATTERN, "");
  }
  return current;
}
