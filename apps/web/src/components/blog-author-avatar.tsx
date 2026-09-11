"use client";

import Image from "next/image";
import { useState } from "react";
import type { BlogAuthorAvatarProps } from "~types/blog";

import placeholders from "@/constants/blog-image-placeholders.json";

export function BlogAuthorAvatar({
  image,
  name,
  size = 24,
}: BlogAuthorAvatarProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const placeholder = Object.entries(placeholders).find(
    ([src]) => src === image
  )?.[1];

  return (
    <span
      className="bg-muted text-muted-foreground relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ width: size, height: size, fontSize: size >= 80 ? 24 : 12 }}
    >
      {image && failedImage !== image ? (
        <Image
          alt={name}
          blurDataURL={placeholder?.blurDataURL}
          className="size-full object-cover"
          height={size}
          onError={() => setFailedImage(image)}
          placeholder={placeholder ? "blur" : "empty"}
          sizes={`${size}px`}
          src={image}
          width={size}
        />
      ) : (
        <span aria-label={name} role="img">
          {name.charAt(0)}
        </span>
      )}
    </span>
  );
}
