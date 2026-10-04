import type { FrameworkImageProps } from "@notra/ui/types/framework";

type ImageDimension = FrameworkImageProps["width"];

function toPixels(value: ImageDimension) {
  return value === undefined ? undefined : Number(value);
}

/**
 * Resolves a URL or a static image import to its URL and rendered size. A
 * static import with only one side given keeps its aspect ratio.
 */
export function resolveImageSource({
  src,
  width,
  height,
}: Pick<FrameworkImageProps, "src" | "width" | "height">) {
  if (typeof src === "string") {
    return {
      source: src,
      width: toPixels(width),
      height: toPixels(height),
      blurDataURL: undefined,
    };
  }
  const image = "default" in src ? src.default : src;
  return {
    source: image.src,
    width:
      toPixels(width) ??
      (height
        ? Math.round((Number(height) * image.width) / image.height)
        : image.width),
    height:
      toPixels(height) ??
      (width
        ? Math.round((Number(width) * image.height) / image.width)
        : image.height),
    blurDataURL: image.blurDataURL,
  };
}

/** Priority images load eagerly at high fetch priority, the rest lazily. */
export function imageLoadingAttributes({
  priority,
  preload,
  loading,
  fetchPriority,
}: Pick<
  FrameworkImageProps,
  "priority" | "preload" | "loading" | "fetchPriority"
>) {
  const eager = priority || preload;
  return {
    loading: loading ?? (eager ? "eager" : "lazy"),
    fetchPriority: fetchPriority ?? (eager ? "high" : undefined),
  } satisfies Pick<FrameworkImageProps, "loading" | "fetchPriority">;
}
