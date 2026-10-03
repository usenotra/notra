import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { Element, ElementContent, Root as HastRoot } from "hast";
import { fromHtml } from "hast-util-from-html";
import { toMdast } from "hast-util-to-mdast";
import type { Root as MdastRoot } from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import { SKIP, visit } from "unist-util-visit";

/** Written by the theme's `notra-pages.json` endpoint for every area build. */
export interface AreaPages {
  area: "blog" | "changelog";
  title: string;
  description?: string;
  indexPath: string;
  entries: Array<{
    path: string;
    title: string;
    description?: string;
    date: string;
    updated?: string;
    authors?: string[];
    version?: string;
    tags: string[];
    indexable: boolean;
  }>;
}

export type AreaPageEntry = AreaPages["entries"][number];

const DROPPED_TAGS = new Set([
  "script",
  "style",
  "template",
  "button",
  "svg",
  "noscript",
]);

const BLOCK_TAGS = new Set(["p", "div", "h2", "h3", "h4", "img"]);
const TEXT_BLOCK_TAGS = new Set(["p", "h2", "h3", "h4"]);

function text(value: string): ElementContent {
  return { type: "text", value };
}

function strong(value: string): Element {
  return {
    type: "element",
    tagName: "strong",
    properties: {},
    children: [text(value)],
  };
}

function paragraph(children: ElementContent[]): Element {
  return { type: "element", tagName: "p", properties: {}, children };
}

function findMarkdownRoot(tree: HastRoot): Element | null {
  let root: Element | null = null;
  visit(tree, "element", (node) => {
    if (node.properties.dataMdRoot !== undefined) {
      root = node;
      return false;
    }
    return undefined;
  });
  return root;
}

/**
 * Rewrites the theme's components into plain HTML that maps cleanly to
 * Markdown: callouts become quotes with their label, tab and accordion titles
 * become bold lines, Shiki blocks keep their language, chrome is dropped.
 */
function simplify(root: Element) {
  // Astro's island markers and hydration comments are not content.
  visit(root, "comment", (_node, index, parent) => {
    if (parent && index !== undefined) {
      parent.children.splice(index, 1);
      return [SKIP, index];
    }
    return undefined;
  });
  visit(root, "element", (node, index, parent) => {
    if (!parent || index === undefined) {
      return undefined;
    }
    if (
      DROPPED_TAGS.has(node.tagName) ||
      node.properties.dataMdSkip !== undefined
    ) {
      parent.children.splice(index, 1);
      return [SKIP, index];
    }
    const props = node.properties;
    if (node.tagName === "pre" && typeof props.dataLanguage === "string") {
      const code = node.children.find(
        (child): child is Element =>
          child.type === "element" && child.tagName === "code"
      );
      if (code && props.dataLanguage !== "plaintext") {
        code.properties.className = [`language-${props.dataLanguage}`];
      }
    }
    if (node.tagName === "aside" && typeof props.ariaLabel === "string") {
      node.tagName = "blockquote";
      let titled = false;
      visit(node, "element", (inner) => {
        if (inner.properties.dataCalloutTitle !== undefined) {
          inner.children = [strong(textOf(inner))];
          titled = true;
        }
      });
      if (!titled) {
        node.children.unshift(paragraph([strong(props.ariaLabel)]));
      }
    }
    if (props.dataNotraTabTitle !== undefined || node.tagName === "summary") {
      node.tagName = "p";
      node.children = [strong(textOf(node))];
      return SKIP;
    }
    // A card is one link around a title and a description: keep it as one Markdown link.
    if (
      node.tagName === "a" &&
      node.children.some(
        (child) => child.type === "element" && BLOCK_TAGS.has(child.tagName)
      )
    ) {
      const [title = textOf(node), ...rest] = textBlocks(node);
      parent.children[index] = paragraph([
        { ...node, children: [text(title)] },
        ...(rest.length > 0 ? [text(`: ${rest.join(" ")}`)] : []),
      ]);
      return SKIP;
    }
    if (node.tagName === "figcaption") {
      node.tagName = "p";
      node.children = [
        {
          type: "element",
          tagName: "em",
          properties: {},
          children: node.children,
        },
      ];
    }
    return undefined;
  });
}

function isDropped(node: Element): boolean {
  return (
    DROPPED_TAGS.has(node.tagName) || node.properties.dataMdSkip !== undefined
  );
}

function textOf(node: Element | ElementContent): string {
  if (node.type === "text") {
    return node.value;
  }
  if (node.type !== "element" || isDropped(node)) {
    return "";
  }
  return node.children.map(textOf).join("").trim();
}

/** Text of each paragraph or heading inside `node`, in order. */
function textBlocks(node: Element): string[] {
  const blocks: string[] = [];
  for (const child of node.children) {
    if (child.type !== "element" || isDropped(child)) {
      continue;
    }
    const hasOwnText = child.children.some(
      (inner) => inner.type === "text" && inner.value.trim() !== ""
    );
    if (TEXT_BLOCK_TAGS.has(child.tagName) || hasOwnText) {
      blocks.push(textOf(child));
    } else {
      blocks.push(...textBlocks(child));
    }
  }
  return blocks.filter(Boolean);
}

/** Links and images become absolute, so the Markdown works wherever an agent stores it. */
function absolutize(tree: MdastRoot, pageUrl: string) {
  visit(tree, (node) => {
    if ((node.type === "link" || node.type === "image") && node.url) {
      try {
        node.url = new URL(node.url, pageUrl).toString();
      } catch {
        // leave malformed URLs as written
      }
    }
  });
}

/** Converts the `[data-md-root]` part of a built page to Markdown. */
export function htmlToMarkdown(html: string, pageUrl: string): string {
  const root = findMarkdownRoot(fromHtml(html));
  if (!root) {
    return "";
  }
  simplify(root);
  const mdast = toMdast({ type: "root", children: root.children }) as MdastRoot;
  absolutize(mdast, pageUrl);
  return toMarkdown(mdast, {
    extensions: [gfmToMarkdown()],
    bullet: "-",
    fences: true,
    rule: "-",
  }).trim();
}

function metaLines(entry: AreaPageEntry, url: string): string[] {
  const lines = [`- URL: ${url}`, `- Published: ${entry.date}`];
  if (entry.updated && entry.updated !== entry.date) {
    lines.push(`- Updated: ${entry.updated}`);
  }
  if (entry.version) {
    lines.push(`- Version: ${entry.version}`);
  }
  if (entry.authors && entry.authors.length > 0) {
    lines.push(`- Authors: ${entry.authors.join(", ")}`);
  }
  if (entry.tags.length > 0) {
    lines.push(`- Tags: ${entry.tags.join(", ")}`);
  }
  return lines;
}

export function entryMarkdown(
  entry: AreaPageEntry,
  url: string,
  body: string
): string {
  const parts = [`# ${entry.title}`];
  if (entry.description) {
    parts.push(`> ${entry.description}`);
  }
  parts.push(metaLines(entry, url).join("\n"));
  if (body) {
    parts.push(body);
  }
  return `${parts.join("\n\n")}\n`;
}

function entryLink(entry: AreaPageEntry, origin: string): string {
  const details = [entry.version, entry.date].filter(Boolean).join(", ");
  const description = entry.description ? `: ${entry.description}` : "";
  return `- [${entry.title}](${new URL(`${entry.path}.md`, origin)})${description} (${details})`;
}

/** The area index as Markdown: every entry with a link to its own Markdown page. */
export function indexMarkdown(pages: AreaPages, origin: string): string {
  const parts = [`# ${pages.title}`];
  if (pages.description) {
    parts.push(`> ${pages.description}`);
  }
  parts.push(
    pages.entries.length > 0
      ? pages.entries.map((entry) => entryLink(entry, origin)).join("\n")
      : "_No entries yet._"
  );
  return `${parts.join("\n\n")}\n`;
}

/** https://llmstxt.org: a Markdown map of the site for language models. */
export function llmsTxt(params: {
  name: string;
  description?: string;
  areas: AreaPages[];
  origin: string;
  fullTextPath: string;
}): string {
  const parts = [`# ${params.name}`];
  if (params.description) {
    parts.push(`> ${params.description}`);
  }
  parts.push(
    "Every page is also available as Markdown: append `.md` to its URL or request it with `Accept: text/markdown`."
  );
  for (const area of params.areas) {
    const entries = area.entries.filter((entry) => entry.indexable);
    parts.push(
      [
        `## ${area.title}`,
        "",
        `- [${area.title} index](${new URL(`${area.indexPath === "/" ? "" : area.indexPath}/index.md`, params.origin)})${area.description ? `: ${area.description}` : ""}`,
        ...entries.map((entry) => entryLink(entry, params.origin)),
      ].join("\n")
    );
  }
  parts.push(
    `## Optional\n\n- [Full text](${new URL(params.fullTextPath, params.origin)}): every page above in one file`
  );
  return `${parts.join("\n\n")}\n`;
}

/** `/blog/post` → `/blog/post/index.<extension>`, where Astro writes the page. */
function pageFile(pagePath: string, extension: "html" | "md"): string {
  return `${pagePath === "/" ? "" : pagePath}/index.${extension}`;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function write(outDir: string, urlPath: string, content: string) {
  const target = join(outDir, urlPath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content);
}

/**
 * Makes the site readable for agents: a Markdown twin next to every page
 * (`/blog/post/index.md`, served for `/blog/post.md` and `Accept: text/markdown`),
 * plus llms.txt and llms-full.txt for the whole site and for each mounted area
 * (a customer proxy only forwards the mount). A customer's own public file wins.
 */
export async function writeAgentFiles(params: {
  outDir: string;
  origin: string;
  siteName: string;
  siteDescription?: string;
  areas: AreaPages[];
  pageHtml: ReadonlyMap<string, string>;
}): Promise<void> {
  const { outDir, origin } = params;
  const fullText = new Map<AreaPages["area"], string[]>();
  for (const area of params.areas) {
    const texts: string[] = [];
    for (const entry of area.entries) {
      const url = new URL(entry.path, origin).toString();
      const html = params.pageHtml.get(pageFile(entry.path, "html")) ?? "";
      const markdown = entryMarkdown(entry, url, htmlToMarkdown(html, url));
      await write(outDir, pageFile(entry.path, "md"), markdown);
      if (entry.indexable) {
        texts.push(markdown);
      }
    }
    fullText.set(area.area, texts);
    await write(
      outDir,
      pageFile(area.indexPath, "md"),
      indexMarkdown(area, origin)
    );
  }

  const scopes = [
    { prefix: "", areas: params.areas },
    ...params.areas
      .filter((area) => area.indexPath !== "/")
      .map((area) => ({ prefix: area.indexPath, areas: [area] })),
  ];
  for (const scope of scopes) {
    const fullTextPath = `${scope.prefix}/llms-full.txt`;
    const llmsPath = `${scope.prefix}/llms.txt`;
    const areaTitle = scope.prefix ? scope.areas[0]?.title : undefined;
    // "Acme" + "Changelog" → "Acme Changelog", but "Acme Blog" stays "Acme Blog".
    let name = params.siteName;
    if (areaTitle) {
      name = areaTitle.startsWith(params.siteName)
        ? areaTitle
        : `${params.siteName} ${areaTitle}`;
    }
    if (!(await exists(join(outDir, llmsPath)))) {
      await write(
        outDir,
        llmsPath,
        llmsTxt({
          name,
          description: params.siteDescription,
          areas: scope.areas,
          origin,
          fullTextPath,
        })
      );
    }
    if (!(await exists(join(outDir, fullTextPath)))) {
      const pages = scope.areas.flatMap(
        (area) => fullText.get(area.area) ?? []
      );
      await write(
        outDir,
        fullTextPath,
        [`# ${name}`, ...pages].join("\n\n---\n\n")
      );
    }
  }
}
