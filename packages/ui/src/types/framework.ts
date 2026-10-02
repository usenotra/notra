import type {
  AnchorHTMLAttributes,
  ComponentType,
  ImgHTMLAttributes,
  ReactNode,
  Ref,
} from "react";

export interface FrameworkLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  prefetch?: boolean | null;
  replace?: boolean;
  scroll?: boolean;
  ref?: Ref<HTMLAnchorElement>;
}

export interface FrameworkStaticImageData {
  src: string;
  width: number;
  height: number;
  blurDataURL?: string;
}

export interface FrameworkImageLoaderProps {
  src: string;
  width: number;
  quality?: number;
}

export interface FrameworkImageProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "width" | "height"
> {
  src:
    | string
    | FrameworkStaticImageData
    | { default: FrameworkStaticImageData };
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
  loader?: (props: FrameworkImageLoaderProps) => string;
  overrideSrc?: string;
  onLoadingComplete?: (image: HTMLImageElement) => void;
  ref?: Ref<HTMLImageElement>;
}

export interface FrameworkComponents {
  Link: ComponentType<FrameworkLinkProps>;
  Image: ComponentType<FrameworkImageProps>;
}

export interface FrameworkProviderProps extends Partial<FrameworkComponents> {
  children: ReactNode;
}
