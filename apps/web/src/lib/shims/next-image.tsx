import type { NextImageShimProps } from "@/types/shims";

export default function Image({
  fill,
  priority,
  unoptimized: _unoptimized,
  placeholder: _placeholder,
  blurDataURL: _blurDataURL,
  quality: _quality,
  className,
  alt,
  ...props
}: NextImageShimProps) {
  return (
    <img
      alt={alt}
      className={
        fill ? `absolute inset-0 size-full ${className ?? ""}` : className
      }
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      loading={priority ? "eager" : "lazy"}
      {...props}
    />
  );
}
