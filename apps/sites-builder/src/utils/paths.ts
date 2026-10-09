import type { EntryIdOptions } from "../types/entries";

export function mountPath(mount: string, path = ""): string {
  const tail = path.replace(/^\/+/, "");
  if (mount === "/") {
    return `/${tail}`;
  }
  return tail ? `${mount}/${tail}` : mount;
}

export const entryId = ({ entry }: EntryIdOptions) =>
  entry.replace(/\.(?:mdx|md)$/, "");
