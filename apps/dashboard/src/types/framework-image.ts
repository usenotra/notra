import type { ImgHTMLAttributes, Ref } from "react";

export interface ImageSource {
  data: Buffer;
  cacheControl?: string;
}

export interface CachedImage {
  data: Buffer;
  contentType: string;
  etag: string;
  maxAge: number;
  createdAt: number;
}

export interface StaticImageData {
  src: string;
  width: number;
  height: number;
  blurDataURL?: string;
}

export interface ImageLoaderProps {
  src: string;
  width: number;
  quality?: number;
}

export interface ImageProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "width" | "height"
> {
  src: string | StaticImageData | { default: StaticImageData };
  alt: string;
  width?: number | `${number}`;
  height?: number | `${number}`;
  fill?: boolean;
  priority?: boolean;
  preload?: boolean;
  unoptimized?: boolean;
  quality?: number | `${number}`;
  placeholder?: "empty" | "blur" | `data:image/${string}`;
  blurDataURL?: string;
  loader?: (props: ImageLoaderProps) => string;
  overrideSrc?: string;
  onLoadingComplete?: (image: HTMLImageElement) => void;
  ref?: Ref<HTMLImageElement>;
}
