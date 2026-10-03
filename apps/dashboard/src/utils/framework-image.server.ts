import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { readFile, realpath, stat } from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP } from "node:net";
import path from "node:path";

import sharp, { type Sharp } from "sharp";

import {
  IMAGE_BLOCKED_IPV4_SUBNETS,
  IMAGE_BLOCKED_IPV6_SUBNETS,
  IMAGE_CACHE_MAX_BYTES,
  IMAGE_CACHE_MAX_ENTRIES,
  IMAGE_MAX_BYTES,
  IMAGE_MAX_PIXELS,
  IMAGE_MINIMUM_CACHE_TTL,
  IMAGE_SECURITY_HEADERS,
  IMAGE_WIDTHS,
} from "../constants/framework-image";
import type { CachedImage, ImageSource } from "../types/framework-image";
import { isAllowedImageUrl, negotiateImageFormat } from "./framework-image";

export function imageCacheMaxAge(cacheControl?: string) {
  const directives = new Map(
    (cacheControl ?? "")
      .toLowerCase()
      .split(",")
      .map((part) => {
        const [name, value = ""] = part.trim().split("=");
        return [name?.trim(), value.trim().replace(/^"|"$/g, "")];
      })
  );
  if (
    ["private", "no-store", "no-cache"].some((name) => directives.has(name))
  ) {
    return 0;
  }
  const value = directives.get("s-maxage") ?? directives.get("max-age") ?? "";
  const maxAge = /^\d+$/.test(value) ? Number(value) : 0;
  return Math.max(
    IMAGE_MINIMUM_CACHE_TTL,
    Number.isSafeInteger(maxAge) ? maxAge : 0
  );
}

export class FrameworkImageCache {
  private entries = new Map<string, CachedImage>();
  private bytes = 0;
  private maxBytes: number;
  private maxEntries: number;

  constructor(
    maxBytes = IMAGE_CACHE_MAX_BYTES,
    maxEntries = IMAGE_CACHE_MAX_ENTRIES
  ) {
    this.maxBytes = maxBytes;
    this.maxEntries = maxEntries;
  }

  get(key: string, now = Date.now()) {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }
    this.entries.delete(key);
    if (now >= entry.createdAt + entry.maxAge * 1000) {
      this.bytes -= entry.data.byteLength;
      return undefined;
    }
    this.entries.set(key, entry);
    return entry;
  }

  set(key: string, entry: CachedImage) {
    const previous = this.entries.get(key);
    if (previous) {
      this.bytes -= previous.data.byteLength;
      this.entries.delete(key);
    }
    if (
      entry.maxAge <= 0 ||
      entry.data.byteLength > this.maxBytes ||
      this.maxEntries <= 0
    ) {
      return;
    }
    this.entries.set(key, entry);
    this.bytes += entry.data.byteLength;
    while (this.bytes > this.maxBytes || this.entries.size > this.maxEntries) {
      const oldest = this.entries.entries().next().value;
      if (!oldest) {
        break;
      }
      this.bytes -= oldest[1].data.byteLength;
      this.entries.delete(oldest[0]);
    }
  }
}

const imageCache = new FrameworkImageCache();

function imageResponse(request: Request, image: CachedImage) {
  const headers = {
    ...IMAGE_SECURITY_HEADERS,
    "Content-Type": image.contentType,
    "Cache-Control":
      image.maxAge > 0
        ? `public, max-age=${image.maxAge}, s-maxage=${image.maxAge}, must-revalidate`
        : "no-store",
    Age: String(Math.max(0, Math.floor((Date.now() - image.createdAt) / 1000))),
    ETag: image.etag,
  };
  const matches = request.headers
    .get("if-none-match")
    ?.split(",")
    .some((tag) => {
      const value = tag.trim().replace(/^W\//, "");
      return value === "*" || value === image.etag;
    });
  return new Response(
    matches || request.method === "HEAD" ? null : new Uint8Array(image.data),
    {
      status: matches ? 304 : 200,
      headers,
    }
  );
}

export function isPublicImageAddress(address: string) {
  const family = isIP(address);
  const blocked = new BlockList();
  for (const [network, prefix] of IMAGE_BLOCKED_IPV4_SUBNETS) {
    if (family === 4) {
      blocked.addSubnet(network, prefix, "ipv4");
    }
  }
  for (const [network, prefix] of IMAGE_BLOCKED_IPV6_SUBNETS) {
    if (family === 6) {
      blocked.addSubnet(network, prefix, "ipv6");
    }
  }
  return (
    family !== 0 && !blocked.check(address, family === 4 ? "ipv4" : "ipv6")
  );
}

async function fetchRemoteImage(url: URL, redirects = 0): Promise<ImageSource> {
  if (!isAllowedImageUrl(url) || redirects > 3) {
    throw new Error("Image source is not allowed");
  }
  const addresses = await lookup(url.hostname, { all: true });
  if (
    !addresses.length ||
    addresses.some(({ address }) => !isPublicImageAddress(address))
  ) {
    throw new Error("Image source address is not allowed");
  }
  const address = addresses[0];
  if (!address) {
    throw new Error("Image source has no address");
  }
  const response = await new Promise<http.IncomingMessage>(
    (resolve, reject) => {
      const transport = url.protocol === "https:" ? https : http;
      const request = transport.get(
        url,
        {
          signal: AbortSignal.timeout(10_000),
          family: address.family,
          lookup: (_hostname, _options, callback) =>
            callback(null, address.address, address.family),
          headers: { Accept: "image/*" },
        },
        resolve
      );
      request.on("error", reject);
    }
  );
  if (
    response.statusCode &&
    response.statusCode >= 300 &&
    response.statusCode < 400 &&
    response.headers.location
  ) {
    response.destroy();
    return await fetchRemoteImage(
      new URL(response.headers.location, url),
      redirects + 1
    );
  }
  if (response.statusCode !== 200) {
    response.destroy();
    throw new Error("Image source request failed");
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of response) {
    size += chunk.length;
    if (size > IMAGE_MAX_BYTES) {
      response.destroy();
      throw new Error("Image exceeds size limit");
    }
    chunks.push(Buffer.from(chunk));
  }
  return {
    data: Buffer.concat(chunks),
    cacheControl: response.headers["cache-control"],
  };
}

async function readLocalImage(source: string): Promise<Buffer> {
  if (
    !source.startsWith("/") ||
    source.startsWith("//") ||
    source.includes("\\")
  ) {
    throw new Error("Invalid local image path");
  }
  const pathname = decodeURIComponent(
    new URL(source, "http://localhost").pathname
  );
  if (
    pathname
      .split("/")
      .some((segment) => segment === ".." || segment === ".") ||
    pathname.includes("\\") ||
    pathname.includes("\0")
  ) {
    throw new Error("Invalid local image path");
  }
  for (const directory of [
    "public",
    ".output/public",
    ".vercel/output/static",
  ]) {
    try {
      const root = await realpath(path.resolve(directory));
      const file = await realpath(path.resolve(root, `.${pathname}`));
      if (!file.startsWith(`${root}${path.sep}`)) {
        throw new Error("Invalid local image path");
      }
      const metadata = await stat(file);
      if (!metadata.isFile() || metadata.size > IMAGE_MAX_BYTES) {
        throw new Error("Invalid local image file");
      }
      return await readFile(file);
    } catch {
      continue;
    }
  }
  try {
    // Nitro's `useStorage` is a plain accessor, not a React hook.
    const { useStorage: getStorage } = await import("nitro/storage");
    const asset = await getStorage("assets:images").getItemRaw<Uint8Array>(
      pathname.slice(1)
    );
    if (asset && asset.byteLength <= IMAGE_MAX_BYTES) {
      return Buffer.from(asset);
    }
  } catch {
    throw new Error("Local image not found");
  }
  throw new Error("Local image not found");
}

export async function optimizeFrameworkImage(request: Request) {
  const params = new URL(request.url).searchParams;
  const source = params.get("url");
  const width = Number(params.get("w"));
  const quality = Number(params.get("q") ?? 75);
  if (!source || !IMAGE_WIDTHS.includes(width) || quality !== 75) {
    return new Response("Invalid image parameters", {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }
  try {
    if (!source.startsWith("/") && !isAllowedImageUrl(new URL(source))) {
      throw new Error("Image source is not allowed");
    }
    const format = negotiateImageFormat(request.headers.get("accept"));
    const cacheKey = JSON.stringify([source, width, quality, format]);
    const cached = imageCache.get(cacheKey);
    if (cached) {
      return imageResponse(request, cached);
    }
    const input = source.startsWith("/")
      ? { data: await readLocalImage(source) }
      : await fetchRemoteImage(new URL(source));
    const respond = (data: Buffer, contentType: string) => {
      const image: CachedImage = {
        data,
        contentType,
        etag: `"${createHash("sha256").update(data).digest("base64url")}"`,
        maxAge: imageCacheMaxAge(input.cacheControl),
        createdAt: Date.now(),
      };
      imageCache.set(cacheKey, image);
      return imageResponse(request, image);
    };
    const pipeline = sharp(input.data, {
      limitInputPixels: IMAGE_MAX_PIXELS,
      animated: true,
    });
    const metadata = await pipeline.metadata();
    if (metadata.format === "svg" || (metadata.pages ?? 1) > 1) {
      return respond(
        input.data,
        metadata.format === "svg" ? "image/svg+xml" : `image/${metadata.format}`
      );
    }
    const resized = pipeline
      .rotate()
      .resize({ width, withoutEnlargement: true });
    let output: Sharp;
    if (format === "avif") {
      output = resized.avif({ quality });
    } else if (format === "webp") {
      output = resized.webp({ quality });
    } else if (metadata.hasAlpha) {
      output = resized.png();
    } else {
      output = resized.jpeg({ quality });
    }
    const result = await output.toBuffer({ resolveWithObject: true });
    return respond(result.data, `image/${format ?? result.info.format}`);
  } catch {
    return new Response("Unable to optimize image", {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
