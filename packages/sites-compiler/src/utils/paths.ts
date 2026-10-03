import { posix } from "node:path";

const IMPORTABLE_EXTENSIONS = [".mdx", ".md", ".jsx", ".js"] as const;

export type ImportKind = "content" | "component";

export type ResolvedImport =
  | { ok: true; path: string; kind: ImportKind }
  | { ok: false; message: string };

/**
 * Resolves a Mintlify-style import (`/snippets/a.jsx`, `./b.mdx`, `../c`) to a
 * site-relative path. Bare specifiers, URLs and anything that leaves the site
 * root are rejected.
 */
export function resolveSiteImport(
  fromPath: string,
  source: string,
  files: ReadonlySet<string>
): ResolvedImport {
  if (
    !(
      source.startsWith("/") ||
      source.startsWith("./") ||
      source.startsWith("../")
    )
  ) {
    return {
      ok: false,
      message: `Cannot import "${source}": only files from this repository can be imported (start the path with / or ./). npm packages are not supported.`,
    };
  }
  const joined = source.startsWith("/")
    ? posix.normalize(source.slice(1))
    : posix.normalize(posix.join(posix.dirname(fromPath), source));
  if (joined.startsWith("..") || posix.isAbsolute(joined)) {
    return {
      ok: false,
      message: `Cannot import "${source}": the path leaves the site root`,
    };
  }
  const extension = posix.extname(joined).toLowerCase();
  const candidates = (IMPORTABLE_EXTENSIONS as readonly string[]).includes(
    extension
  )
    ? [joined]
    : IMPORTABLE_EXTENSIONS.map((ext) => `${joined}${ext}`);
  for (const candidate of candidates) {
    if (files.has(candidate)) {
      const candidateExtension = posix.extname(candidate).toLowerCase();
      return {
        ok: true,
        path: candidate,
        kind:
          candidateExtension === ".jsx" || candidateExtension === ".js"
            ? "component"
            : "content",
      };
    }
  }
  if (extension === ".json") {
    return {
      ok: false,
      message: `Cannot import "${source}": JSON imports are not supported`,
    };
  }
  return { ok: false, message: `Cannot import "${source}": file not found` };
}

export function offsetToLineColumn(
  source: string,
  offset: number
): { line: number; column: number } {
  let line = 1;
  let lastBreak = -1;
  const end = Math.min(offset, source.length);
  for (let index = 0; index < end; index += 1) {
    if (source.charCodeAt(index) === 10) {
      line += 1;
      lastBreak = index;
    }
  }
  return { line, column: offset - lastBreak };
}
