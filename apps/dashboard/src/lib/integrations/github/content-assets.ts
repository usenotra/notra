import { posix } from "node:path";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { fromMarkdown } from "mdast-util-from-markdown";

import {
  GITHUB_CONTENT_MAX_ASSET_BYTES,
  GITHUB_CONTENT_MAX_ASSET_COUNT,
  GITHUB_CONTENT_MAX_SINGLE_ASSET_BYTES,
} from "@/constants/github";
import type {
  GitHubMarkdownNode,
  GitHubSourceImageAsset,
  PrepareGitHubContentAssetsParams,
  PreparedGitHubContent,
} from "@/types/integrations/github";

import { getOptionalR2PublicUrl, getR2StorageConfig } from "../../upload/r2";

const IMAGE_EXTENSION_PATTERN = /\.(avif|gif|jpe?g|png|svg|webp)$/i;
const CONTENT_TYPE_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/avif": ".avif",
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/svg+xml": ".svg",
  "image/webp": ".webp",
};

export function expandGitHubPathTemplate(template: string, slug: string) {
  return template.replaceAll(":slug", slug);
}

function findMarkdownImageOccurrences(markdown: string) {
  const occurrences: Array<{
    alt?: string;
    end: number;
    start: number;
    title?: string | null;
    url: string;
  }> = [];
  let destination: { end?: number; image: boolean; start?: number } | undefined;

  const tree = fromMarkdown(markdown, {
    mdastExtensions: [
      {
        enter: {
          resourceDestinationString(token) {
            destination = {
              end: token.end.offset,
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
            if (
              destination?.image &&
              destination.start !== undefined &&
              destination.end !== undefined
            ) {
              occurrences.push({
                end: destination.end,
                start: destination.start,
                url,
              });
            }
            destination = undefined;
          },
        },
      },
    ],
  }) as GitHubMarkdownNode;

  const definitions = new Map<string, { title?: string | null; url: string }>();
  const visitDefinitions = (node: GitHubMarkdownNode) => {
    if (
      node.type === "definition" &&
      node.identifier &&
      node.url !== undefined &&
      !definitions.has(node.identifier)
    ) {
      definitions.set(node.identifier, { title: node.title, url: node.url });
    }
    node.children?.forEach(visitDefinitions);
  };
  visitDefinitions(tree);

  const visitReferences = (node: GitHubMarkdownNode) => {
    if (
      node.type === "imageReference" &&
      node.identifier &&
      node.position?.start.offset !== undefined &&
      node.position.end.offset !== undefined
    ) {
      const definition = definitions.get(node.identifier);
      if (definition) {
        occurrences.push({
          alt: node.alt ?? "",
          end: node.position.end.offset,
          start: node.position.start.offset,
          title: definition.title,
          url: definition.url,
        });
      }
    }
    node.children?.forEach(visitReferences);
  };
  visitReferences(tree);

  return occurrences.sort((left, right) => left.start - right.start);
}

function renderInlineImage(
  alt: string,
  destination: string,
  title: string | null | undefined
) {
  const escapedAlt = [...alt]
    .map((character) => {
      if (character === "&") {
        return "&amp;";
      }
      if (character === "\r") {
        return "&#13;";
      }
      if (character === "\n") {
        return "&#10;";
      }
      return /[!"#$%'()*+,\-./:;<=>?@[\\\]^_`{|}~]/.test(character)
        ? `\\${character}`
        : character;
    })
    .join("");
  const escapedTitle = title
    ?.replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("\r", "&#13;")
    .replaceAll("\n", "&#10;")
    .replaceAll("\\", "\\\\");
  const titleSuffix = escapedTitle === undefined ? "" : ` "${escapedTitle}"`;
  return `![${escapedAlt}](${destination}${titleSuffix})`;
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
  const pathExtension = IMAGE_EXTENSION_PATTERN.exec(key)?.[0].toLowerCase();
  return pathExtension ?? CONTENT_TYPE_EXTENSIONS[contentType ?? ""] ?? ".png";
}

function resolveIndexedImagePath(
  template: string,
  extension: string,
  index: number
) {
  const expanded = template.replaceAll(":index", String(index));
  const configuredExtension = IMAGE_EXTENSION_PATTERN.exec(expanded)?.[0];
  const path = configuredExtension ? expanded : `${expanded}${extension}`;
  if (index === 1 || template.includes(":index")) {
    return path;
  }

  const finalExtension = IMAGE_EXTENSION_PATTERN.exec(path)?.[0] ?? "";
  return `${path.slice(0, -finalExtension.length)}-${index}${finalExtension}`;
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

function appendSourceFragment(destination: string, sourceUrl: string) {
  const fragment = new URL(sourceUrl).hash.slice(1);
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

async function prepareGitHubContentAssets(
  params: PrepareGitHubContentAssetsParams
): Promise<PreparedGitHubContent> {
  const occurrences = findMarkdownImageOccurrences(params.markdown);
  const imageUrlsByKey = new Map<string, string[]>();

  for (const occurrence of occurrences) {
    const key = getR2Key(occurrence.url, params.publicUrl);
    if (key) {
      const imageUrls = imageUrlsByKey.get(key) ?? [];
      if (!imageUrls.includes(occurrence.url)) {
        imageUrls.push(occurrence.url);
        imageUrlsByKey.set(key, imageUrls);
      }
    }
  }
  if (imageUrlsByKey.size > GITHUB_CONTENT_MAX_ASSET_COUNT) {
    throw new Error(
      `A GitHub draft can include at most ${GITHUB_CONTENT_MAX_ASSET_COUNT} images`
    );
  }
  const images: Array<{
    asset: GitHubSourceImageAsset;
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
      throw new Error("GitHub draft image assets exceed the size limit");
    }
    remainingBytes -= asset.contents.byteLength;
    images.push({ asset, imageUrls });
  }

  const assets = [];
  const replacements = new Map<string, string>();
  for (const [offset, image] of images.entries()) {
    const index = offset + 1;
    const imagePath = resolveIndexedImagePath(
      expandGitHubPathTemplate(params.imagePathTemplate, params.slug),
      image.asset.extension,
      index
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
      const replacement =
        destination && occurrence.alt !== undefined
          ? renderInlineImage(occurrence.alt, destination, occurrence.title)
          : destination;
      return replacement
        ? `${markdown.slice(0, occurrence.start)}${replacement}${markdown.slice(occurrence.end)}`
        : markdown;
    }, params.markdown),
  };
}

export async function prepareR2GitHubContentAssets(params: {
  contentPath: string;
  imagePathTemplate: string;
  markdown: string;
  slug: string;
}) {
  const publicUrl = getOptionalR2PublicUrl();
  if (!publicUrl) {
    return { assets: [], markdown: params.markdown };
  }
  const { bucketName, client } = getR2StorageConfig();

  return prepareGitHubContentAssets({
    ...params,
    publicUrl,
    loadImage: async (key, maxBytes) => {
      const abortController = new AbortController();
      const response = await client.send(
        new GetObjectCommand({ Bucket: bucketName, Key: key }),
        { abortSignal: abortController.signal }
      );
      if (
        response.ContentLength === undefined ||
        response.ContentLength > maxBytes
      ) {
        abortController.abort();
        throw new Error(`Image asset ${key} exceeds the size limit`);
      }
      if (!response.Body) {
        abortController.abort();
        throw new Error(`Image asset ${key} is empty`);
      }
      let contents: Uint8Array;
      try {
        contents = await response.Body.transformToByteArray();
      } catch (error) {
        abortController.abort();
        throw error;
      }
      if (contents.byteLength > maxBytes) {
        abortController.abort();
        throw new Error(`Image asset ${key} exceeds the size limit`);
      }
      return {
        contents,
        extension: resolveImageExtension(key, response.ContentType),
      };
    },
  });
}
