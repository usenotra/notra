"use client";

import { createContext, useContext, useMemo } from "react";
import type {
  FrameworkComponents,
  FrameworkImageProps,
  FrameworkLinkProps,
  FrameworkProviderProps,
} from "@notra/ui/types/framework";

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
  unoptimized: _unoptimized,
  quality: _quality,
  placeholder: _placeholder,
  blurDataURL: _blurDataURL,
  loader: _loader,
  overrideSrc,
  onLoadingComplete,
  onLoad,
  loading,
  fetchPriority,
  style,
  ...props
}: FrameworkImageProps) {
  const image =
    typeof src === "string" ? undefined : "default" in src ? src.default : src;
  const source = typeof src === "string" ? src : image?.src;
  const imageWidth =
    width ??
    (image && height
      ? Math.round((Number(height) * image.width) / image.height)
      : image?.width);
  const imageHeight =
    height ??
    (image && width
      ? Math.round((Number(width) * image.height) / image.width)
      : image?.height);

  return (
    <img
      {...props}
      alt={alt}
      fetchPriority={
        fetchPriority ?? (priority || preload ? "high" : undefined)
      }
      height={fill ? undefined : imageHeight}
      loading={loading ?? (priority || preload ? "eager" : "lazy")}
      onLoad={(event) => {
        onLoad?.(event);
        onLoadingComplete?.(event.currentTarget);
      }}
      src={overrideSrc ?? source}
      style={{
        ...(fill
          ? { position: "absolute", width: "100%", height: "100%", inset: 0 }
          : {}),
        ...style,
      }}
      width={fill ? undefined : imageWidth}
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
