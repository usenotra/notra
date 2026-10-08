import { CONTENT_TYPES } from "../constants/content-types";

export function contentTypeForPath(path: string): string {
  if (path.endsWith("/feed.xml")) {
    return "application/rss+xml; charset=utf-8";
  }
  const extension = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  return CONTENT_TYPES[extension] ?? "application/octet-stream";
}
