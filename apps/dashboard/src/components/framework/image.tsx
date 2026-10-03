import { FILL_IMAGE_STYLE } from "@notra/ui/constants/framework-image";
import {
  imageLoadingAttributes,
  resolveImageSource,
} from "@notra/ui/lib/framework-image";
import type { FrameworkImageProps } from "@notra/ui/types/framework";
import { useState } from "react";

import {
  imagePlaceholderUrl,
  optimizedImageSources,
} from "../../utils/framework-image";

export default function Image({
  src,
  alt,
  width,
  height,
  fill,
  priority,
  preload,
  loading,
  fetchPriority,
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
  ...props
}: FrameworkImageProps) {
  const [loaded, setLoaded] = useState(false);
  const image = resolveImageSource({ src, width, height });
  const direct =
    unoptimized ||
    image.source.startsWith("data:") ||
    image.source.startsWith("blob:");
  const optimized = direct
    ? undefined
    : optimizedImageSources({
        source: image.source,
        width: fill ? undefined : image.width,
        sizes,
        quality: Number(quality),
        loader,
      });
  const blur = loaded
    ? undefined
    : imagePlaceholderUrl(placeholder, blurDataURL ?? image.blurDataURL);

  return (
    <img
      {...props}
      {...imageLoadingAttributes({ priority, preload, loading, fetchPriority })}
      alt={alt}
      decoding="async"
      height={fill ? undefined : image.height}
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
      src={overrideSrc ?? optimized?.src ?? image.source}
      srcSet={optimized?.srcSet}
      style={{
        ...(fill ? FILL_IMAGE_STYLE : {}),
        ...(blur
          ? {
              backgroundImage: `url("${blur}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {}),
        ...style,
      }}
      width={fill ? undefined : image.width}
    />
  );
}
