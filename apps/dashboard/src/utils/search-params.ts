/**
 * Router search serialization that keeps query values as the strings in the
 * URL, like `URLSearchParams`. TanStack's default JSON-parses values
 * (`?flag=true` becomes a boolean, `?q=null` is dropped) and then quotes
 * strings that look like JSON when it writes the URL back (`?flag="true"`).
 * Repeated keys become arrays; object values are written as JSON.
 */
export function parseSearch(searchStr: string): Record<string, unknown> {
  const search: Record<string, string | string[]> = {};
  for (const [key, value] of new URLSearchParams(searchStr)) {
    const previous = search[key];
    if (previous === undefined) {
      search[key] = value;
    } else if (Array.isArray(previous)) {
      previous.push(value);
    } else {
      search[key] = [previous, value];
    }
  }
  return search;
}

export function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, String(item));
      }
    } else if (value !== null && typeof value === "object") {
      params.set(key, JSON.stringify(value));
    } else {
      params.set(key, String(value));
    }
  }
  const searchStr = params.toString();
  return searchStr ? `?${searchStr}` : "";
}
