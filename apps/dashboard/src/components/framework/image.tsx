import { useState } from "react";

import type { ImageProps } from "../../types/framework-image";
import { getImageWidths, imageOptimizerUrl } from "../../utils/framework-image";

export default function Image({
  src,
  alt,
  width,
  height,
  fill,
  priority,
  preload,
  unoptimized,
  quality = 75,
  placeholder,
  blurDataURL,
  loader,
  overrideSrc,
  onLoadingComplete,
  onLoad,
  onError,
  style,
  sizes,
  loading,
  fetchPriority,
  ...props
}: ImageProps) {
  const [loaded, setLoaded] = useState(false);
  let image;
  if (typeof src !== "string") {
    image = "default" in src ? src.default : src;
  }
  const source = typeof src === "string" ? src : (image?.src ?? "");
  let imageWidth = width ? Number(width) : image?.width;
  let imageHeight = height ? Number(height) : image?.height;
  if (image && height && !width) {
    imageWidth = Math.round((Number(height) * image.width) / image.height);
  }
  if (image && width && !height) {
    imageHeight = Math.round((Number(width) * image.height) / image.width);
  }
  const direct =
    unoptimized || source.startsWith("data:") || source.startsWith("blob:");
  const generate = (target: number) =>
    loader
      ? loader({ src: source, width: target, quality: Number(quality) })
      : imageOptimizerUrl(source, target, Number(quality));
  const { widths, kind } = getImageWidths(fill ? undefined : imageWidth, sizes);
  let blur;
  if (placeholder === "blur") {
    blur = blurDataURL ?? image?.blurDataURL;
  } else if (placeholder?.startsWith("data:")) {
    blur = placeholder;
  }

  return (
    <img
      {...props}
      alt={alt}
      decoding="async"
      fetchPriority={
        fetchPriority ?? (priority || preload ? "high" : undefined)
      }
      height={fill ? undefined : imageHeight}
      loading={loading ?? (priority || preload ? "eager" : "lazy")}
      onError={(event) => {
        setLoaded(true);
        onError?.(event);
      }}
      onLoad={(event) => {
        setLoaded(true);
        onLoad?.(event);
        onLoadingComplete?.(event.currentTarget);
      }}
      sizes={sizes ?? (fill ? "100vw" : undefined)}
      src={overrideSrc ?? (direct ? source : generate(widths.at(-1) ?? 3840))}
      srcSet={
        direct
          ? undefined
          : widths
              .map(
                (target, index) =>
                  `${generate(target)} ${kind === "w" ? target : index + 1}${kind}`
              )
              .join(", ")
      }
      style={{
        ...(fill
          ? { position: "absolute", height: "100%", width: "100%", inset: 0 }
          : {}),
        ...(!loaded && blur
          ? {
              backgroundImage: `url("${blur}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {}),
        ...style,
      }}
      width={fill ? undefined : imageWidth}
    />
  );
}
