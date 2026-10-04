"use client";

import { createContext, useContext, useMemo } from "react";
import type {
  FrameworkComponents,
  FrameworkImageProps,
  FrameworkLinkProps,
  FrameworkProviderProps,
} from "@notra/ui/types/framework";
import { FILL_IMAGE_STYLE } from "@notra/ui/constants/framework-image";
import {
  imageLoadingAttributes,
  resolveImageSource,
} from "@notra/ui/lib/framework-image";

function NativeLink({
  prefetch: _prefetch,
  replace: _replace,
  scroll: _scroll,
  ...props
}: FrameworkLinkProps) {
  return <a {...props} />;
}

function NativeImage({
  src,
  alt,
  width,
  height,
  fill,
  priority,
  preload,
  loading,
  fetchPriority,
  unoptimized: _unoptimized,
  quality: _quality,
  placeholder: _placeholder,
  blurDataURL: _blurDataURL,
  loader: _loader,
  overrideSrc,
  onLoadingComplete,
  onLoad,
  style,
  ...props
}: FrameworkImageProps) {
  const image = resolveImageSource({ src, width, height });

  return (
    <img
      {...props}
      {...imageLoadingAttributes({ priority, preload, loading, fetchPriority })}
      alt={alt}
      height={fill ? undefined : image.height}
      onLoad={(event) => {
        onLoad?.(event);
        onLoadingComplete?.(event.currentTarget);
      }}
      src={overrideSrc ?? image.source}
      style={fill ? { ...FILL_IMAGE_STYLE, ...style } : style}
      width={fill ? undefined : image.width}
    />
  );
}

const FrameworkContext = createContext<FrameworkComponents>({
  Link: NativeLink,
  Image: NativeImage,
});

export function FrameworkProvider({
  Link,
  Image,
  children,
}: FrameworkProviderProps) {
  const parent = useContext(FrameworkContext);
  const components = useMemo(
    () => ({ Link: Link ?? parent.Link, Image: Image ?? parent.Image }),
    [Link, Image, parent],
  );

  return (
    <FrameworkContext.Provider value={components}>
      {children}
    </FrameworkContext.Provider>
  );
}

export function Link(props: FrameworkLinkProps) {
  const { Link: Component } = useContext(FrameworkContext);
  return <Component {...props} />;
}

export function Image(props: FrameworkImageProps) {
  const { Image: Component } = useContext(FrameworkContext);
  return <Component {...props} />;
}
