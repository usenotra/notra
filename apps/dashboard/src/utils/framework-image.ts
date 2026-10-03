import type { FrameworkImageProps } from "@notra/ui/types/framework";

import {
  IMAGE_DEVICE_WIDTHS,
  IMAGE_REMOTE_HOSTS,
  IMAGE_WIDTHS,
} from "../constants/framework-image";

export function isAllowedImageUrl(url: URL): boolean {
  if (url.username || url.password || url.hash) {
    return false;
  }
  if (url.protocol === "https:" && !url.port) {
    if (IMAGE_REMOTE_HOSTS.has(url.hostname)) {
      return true;
    }
    if (url.hostname === "www.google.com" && url.pathname === "/s2/favicons") {
      return true;
    }
    if (
      url.hostname.endsWith(".r2.cloudflarestorage.com") ||
      url.hostname.endsWith(".r2.dev")
    ) {
      return true;
    }
  }
  const configured = process.env.CLOUDFLARE_PUBLIC_URL;
  if (!configured) {
    return false;
  }
  try {
    const allowed = new URL(configured);
    return (
      (allowed.protocol === "http:" || allowed.protocol === "https:") &&
      url.protocol === allowed.protocol &&
      url.hostname === allowed.hostname &&
      !url.port
    );
  } catch {
    return false;
  }
}

export function imageOptimizerUrl(src: string, width: number, quality = 75) {
  return `/api/image?${new URLSearchParams({ url: src, w: String(width), q: String(quality) })}`;
}

export function getImageWidths(width?: number, sizes?: string) {
  if (sizes || !width) {
    return { widths: sizes ? IMAGE_WIDTHS : IMAGE_DEVICE_WIDTHS, kind: "w" };
  }
  return {
    widths: [
      ...new Set(
        [width, width * 2].map(
          (target) =>
            IMAGE_WIDTHS.find((candidate) => candidate >= target) ?? 3840
        )
      ),
    ],
    kind: "x",
  };
}

export function negotiateImageFormat(accept: string | null) {
  const formats =
    accept?.split(",").map((part) => {
      const [mime, ...parameters] = part.trim().split(";");
      const quality = parameters.find((value) => value.trim().startsWith("q="));
      return { mime, quality: quality ? Number(quality.trim().slice(2)) : 1 };
    }) ?? [];
  const avif =
    formats.find((format) => format.mime === "image/avif")?.quality ?? 0;
  const webp =
    formats.find((format) => format.mime === "image/webp")?.quality ?? 0;
  if (avif > 0 && avif >= webp) {
    return "avif";
  }
  return webp > 0 ? "webp" : undefined;
}

/** `src` and `srcSet` through the image optimizer or a custom loader. */
export function optimizedImageSources({
  source,
  width,
  sizes,
  quality,
  loader,
}: {
  source: string;
  width: number | undefined;
  sizes: string | undefined;
  quality: number;
  loader: FrameworkImageProps["loader"];
}) {
  const generate = (target: number) =>
    loader
      ? loader({ src: source, width: target, quality })
      : imageOptimizerUrl(source, target, quality);
  const { widths, kind } = getImageWidths(width, sizes);
  return {
    src: generate(widths.at(-1) ?? 3840),
    srcSet: widths
      .map(
        (target, index) =>
          `${generate(target)} ${kind === "w" ? target : index + 1}${kind}`
      )
      .join(", "),
  };
}

/** The blurred preview shown until the image loads, if any. */
export function imagePlaceholderUrl(
  placeholder: FrameworkImageProps["placeholder"],
  blurDataURL: string | undefined
) {
  if (placeholder === "blur") {
    return blurDataURL;
  }
  return placeholder?.startsWith("data:") ? placeholder : undefined;
}
