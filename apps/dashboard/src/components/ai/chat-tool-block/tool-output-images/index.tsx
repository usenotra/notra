"use client";

import { Download01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ImageZoom } from "@notra/ui/components/kibo-ui/image-zoom";
import Image from "next/image";

import type { ToolOutputImage } from "./types";
import { downloadToolOutputImage } from "./utils";

export function ToolOutputImages({ images }: { images: ToolOutputImage[] }) {
  if (images.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {images.map((image, index) => (
        <div
          className="group/image border-border bg-muted/20 relative w-fit max-w-full overflow-hidden rounded-lg border"
          key={`${image.url}-${index}`}
        >
          <ImageZoom
            className="block max-w-full transition-opacity group-hover/image:opacity-90"
            zoomMargin={24}
          >
            <Image
              alt={image.filename ?? "tool output image"}
              className="block h-auto max-h-64 w-auto max-w-full cursor-pointer"
              height={512}
              src={image.url}
              unoptimized
              width={768}
            />
          </ImageZoom>
          <button
            aria-label="Download image"
            className="border-border bg-background/90 text-foreground hover:bg-muted focus-visible:ring-ring absolute top-2 right-2 inline-flex size-8 cursor-pointer items-center justify-center rounded-md border opacity-0 shadow-sm backdrop-blur transition-opacity group-hover/image:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:outline-none"
            onClick={() => {
              downloadToolOutputImage(image);
            }}
            title="Download image"
            type="button"
          >
            <HugeiconsIcon
              icon={Download01Icon}
              aria-hidden="true"
              className="size-4"
            />
          </button>
        </div>
      ))}
    </div>
  );
}
