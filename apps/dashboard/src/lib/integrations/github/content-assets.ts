import { posix } from "node:path";

import { GITHUB_IMAGE_EXTENSION_REGEX } from "@notra/schemas/constants/dashboard/github";
import { fromMarkdown } from "mdast-util-from-markdown";

import { CONTENT_IMAGE_MIME_EXTENSIONS } from "@/constants/content-image";
import { CONTENT_VIDEO_MIME_EXTENSIONS } from "@/constants/content-video";
import {
  GITHUB_CONTENT_MAX_ASSET_BYTES,
  GITHUB_CONTENT_MAX_ASSET_COUNT,
  GITHUB_CONTENT_MAX_SINGLE_ASSET_BYTES,
} from "@/constants/github";
import type {
  GitHubSourceImageAsset,
  PrepareGitHubContentAssetsParams,
  PreparedGitHubContent,
} from "@/types/integrations/github";
import {
  contentImageKeyBelongsToOrganization,
  contentMediaExtension,
  getAppContentImageKey,
  readAppOrigin,
} from "@/utils/content-image-key";

import { readContentImage } from "../../upload/content-image-store";
import { getOptionalR2PublicUrl } from "../../upload/r2";

const CONTENT_TYPE_EXTENSIONS: Readonly<Record<string, string>> = {
  ...dottedExtensions(CONTENT_IMAGE_MIME_EXTENSIONS),
  ...dottedExtensions(CONTENT_VIDEO_MIME_EXTENSIONS),
  "image/svg+xml": ".svg",
};

function dottedExtensions(extensions: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(extensions).map(([mime, extension]) => [
      mime,
      `.${extension}`,
    ])
  );
}

export function expandGitHubPathTemplate(template: string, slug: string) {
  return template.replaceAll(":slug", slug);
}

/**
 * Returns image and video URL spans in source order. Image destinations keep
 * alt text, titles, and angle-bracket forms. Reference-style images and raw
 * `<img>` HTML stay untouched: the editor only emits inline images and
 * `<video controls src="...">`.
 *
 * The extension overrides mdast-util-from-markdown's default
 * `resourceDestinationString` handlers, which is the only place the parser
 * exposes the destination's offsets. The replacement keeps the default
 * behaviour (`buffer` on enter, `resume` + `node.url` on exit).
 */
function findMarkdownMediaOccurrences(markdown: string) {
  const occurrences: Array<{ end: number; start: number; url: string }> = [];
  let destination: { end: number; image: boolean; start: number } | undefined;

  const tree = fromMarkdown(markdown, {
    mdastExtensions: [
      {
        enter: {
          resourceDestinationString(token) {
            destination = {
              end: token.end.offset,
              // A destination belongs to an image when the image node is on
              // top of the stack and it is not nested inside another image's
              // alt text (that inner syntax is rendered as plain text).
              image:
                this.stack.at(-1)?.type === "image" &&
                !this.stack.slice(0, -1).some((node) => node.type === "image"),
              start: token.start.offset,
            };
            this.buffer();
          },
        },
        exit: {
          resourceDestinationString() {
            const url = this.resume();
            const node = this.stack.at(-1);
            if (node && "url" in node) {
              node.url = url;
            }
            if (destination?.image) {
              occurrences.push({ ...destination, url });
            }
            destination = undefined;
          },
        },
      },
    ],
  });

  visitMarkdown(tree as MarkdownNode, (node) => {
    if (node.type !== "html" || !node.value) {
      return;
    }
    const offset = node.position?.start.offset;
    if (offset == null) {
      return;
    }
    const match = VIDEO_SRC_PATTERN.exec(node.value);
    const url = match?.[1];
    if (!(match && url) || match.index === undefined) {
      return;
    }
    const relative = node.value.indexOf(url, match.index);
    if (relative < 0) {
      return;
    }
    const start = offset + relative;
    occurrences.push({ end: start + url.length, start, url });
  });

  return occurrences.sort((left, right) => left.start - right.start);
}

interface MarkdownNode {
  children?: MarkdownNode[];
  position?: { start: { offset?: number | null } };
  type: string;
  value?: string;
}

const VIDEO_SRC_PATTERN = /<video\b[^>]*?\ssrc="([^"]+)"/i;

function visitMarkdown(
  node: MarkdownNode,
  visit: (node: MarkdownNode) => void
) {
  visit(node);
  for (const child of node.children ?? []) {
    visitMarkdown(child, visit);
  }
}

function getR2Key(imageUrl: string, publicUrl: string) {
  let source: URL;
  try {
    source = new URL(imageUrl);
  } catch {
    return null;
  }
  if (source.protocol !== "http:" && source.protocol !== "https:") {
    return null;
  }
  const base = new URL(`${publicUrl.replace(/\/+$/, "")}/`);
  if (
    source.origin !== base.origin ||
    !source.pathname.startsWith(base.pathname)
  ) {
    return null;
  }

  let key: string;
  try {
    key = decodeURIComponent(source.pathname.slice(base.pathname.length));
  } catch {
    return null;
  }
  return key && !key.split("/").includes("..") ? key : null;
}

function resolveImageExtension(key: string, contentType?: string) {
  return (
    contentMediaExtension(key) ??
    CONTENT_TYPE_EXTENSIONS[contentType ?? ""] ??
    ".png"
  );
}

function resolveStoredAssetPath(
  template: string,
  extension: string,
  key: string
) {
  const stem =
    key
      .split("/")
      .pop()
      ?.replace(/\.[^.]+$/, "") || "media";
  // Identity-stable: reorder and republish keep the same GitHub path.
  const base = template
    .replaceAll(":index", stem)
    .replace(GITHUB_IMAGE_EXTENSION_REGEX, "");
  if (template.includes(":index")) {
    return `${base}${extension}`;
  }
  return `${base}-${stem}${extension}`;
}

function encodeMarkdownPath(path: string) {
  return path
    .split("/")
    .map((segment) =>
      encodeURIComponent(segment).replace(
        /[!'()*]/g,
        (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
      )
    )
    .join("/");
}

function sourceFragment(sourceUrl: string) {
  try {
    return new URL(sourceUrl).hash.slice(1);
  } catch {
    const hashIndex = sourceUrl.indexOf("#");
    return hashIndex === -1 ? "" : sourceUrl.slice(hashIndex + 1);
  }
}

function appendSourceFragment(destination: string, sourceUrl: string) {
  const fragment = sourceFragment(sourceUrl);
  if (!fragment) {
    return destination;
  }
  let encodedFragment = "";
  for (let index = 0; index < fragment.length;) {
    const escape = fragment.slice(index, index + 3);
    if (/^%[\dA-Fa-f]{2}$/.test(escape)) {
      encodedFragment += escape.toUpperCase();
      index += 3;
      continue;
    }
    const codePoint = fragment.codePointAt(index);
    if (codePoint === undefined) {
      break;
    }
    const character = String.fromCodePoint(codePoint);
    encodedFragment += encodeURIComponent(character).replace(
      /[!'()*]/g,
      (value) => `%${value.charCodeAt(0).toString(16).toUpperCase()}`
    );
    index += character.length;
  }
  return `${destination}#${encodedFragment}`;
}

export function resolveGitHubImagePathTemplate(
  contentPath: string,
  configured: string | null | undefined
) {
  const trimmed = configured?.trim();
  if (trimmed) {
    return trimmed;
  }
  return contentPath.replace(/\.(?:md|mdx)$/i, "");
}

function resolveStoredImageKey(
  imageUrl: string,
  publicUrl: string | null,
  appOrigin: string | null
) {
  const r2Key = publicUrl ? getR2Key(imageUrl, publicUrl) : null;
  return r2Key ?? getAppContentImageKey(imageUrl, appOrigin);
}

function resolveMarkdownImagePath(contentPath: string, imagePath: string) {
  if (imagePath.startsWith("public/")) {
    return `/${encodeMarkdownPath(imagePath.slice("public/".length))}`;
  }

  const relativePath = posix.relative(posix.dirname(contentPath), imagePath);
  const encodedRelativePath = encodeMarkdownPath(relativePath);
  return encodedRelativePath.startsWith(".")
    ? encodedRelativePath
    : `./${encodedRelativePath}`;
}

export async function prepareGitHubContentAssets(
  params: PrepareGitHubContentAssetsParams
): Promise<PreparedGitHubContent> {
  const occurrences = findMarkdownMediaOccurrences(params.markdown);
  const imageUrlsByKey = new Map<string, string[]>();

  for (const occurrence of occurrences) {
    const key = resolveStoredImageKey(
      occurrence.url,
      params.publicUrl,
      params.appOrigin
    );
    if (
      key &&
      contentImageKeyBelongsToOrganization(key, params.organizationId)
    ) {
      const imageUrls = imageUrlsByKey.get(key) ?? [];
      if (!imageUrls.includes(occurrence.url)) {
        imageUrls.push(occurrence.url);
        imageUrlsByKey.set(key, imageUrls);
      }
    }
  }
  if (imageUrlsByKey.size > GITHUB_CONTENT_MAX_ASSET_COUNT) {
    throw new Error(
      `A GitHub draft can include at most ${GITHUB_CONTENT_MAX_ASSET_COUNT} images or videos`
    );
  }
  const images: Array<{
    asset: GitHubSourceImageAsset;
    assetKey: string;
    imageUrls: string[];
  }> = [];
  let remainingBytes = GITHUB_CONTENT_MAX_ASSET_BYTES;
  for (const [key, imageUrls] of imageUrlsByKey) {
    const maxBytes = Math.min(
      remainingBytes,
      GITHUB_CONTENT_MAX_SINGLE_ASSET_BYTES
    );
    const asset = await params.loadImage(key, maxBytes);
    if (asset.contents.byteLength > maxBytes) {
      throw new Error("GitHub draft files exceed the size limit");
    }
    remainingBytes -= asset.contents.byteLength;
    images.push({ asset, assetKey: key, imageUrls });
  }

  const assets = [];
  const replacements = new Map<string, string>();
  for (const image of images) {
    const imagePath = resolveStoredAssetPath(
      expandGitHubPathTemplate(params.imagePathTemplate, params.slug),
      image.asset.extension,
      image.assetKey
    );
    assets.push({ contents: image.asset.contents, path: imagePath });
    const markdownImagePath = resolveMarkdownImagePath(
      params.contentPath,
      imagePath
    );
    for (const imageUrl of image.imageUrls) {
      replacements.set(
        imageUrl,
        appendSourceFragment(markdownImagePath, imageUrl)
      );
    }
  }

  return {
    assets,
    markdown: occurrences.reduceRight((markdown, occurrence) => {
      const destination = replacements.get(occurrence.url);
      return destination
        ? `${markdown.slice(0, occurrence.start)}${destination}${markdown.slice(occurrence.end)}`
        : markdown;
    }, params.markdown),
  };
}

export async function prepareR2GitHubContentAssets(params: {
  contentPath: string;
  imagePathTemplate: string;
  markdown: string;
  organizationId: string;
  slug: string;
}) {
  const publicUrl = getOptionalR2PublicUrl();

  return prepareGitHubContentAssets({
    ...params,
    appOrigin: readAppOrigin(),
    publicUrl,
    loadImage: async (key, maxBytes) => {
      const stored = await readContentImage(key, maxBytes);
      if (!stored) {
        throw new Error(`Content file ${key} is missing`);
      }
      return {
        contents: stored.bytes,
        extension: resolveImageExtension(key, stored.mimeType),
      };
    },
  });
}
