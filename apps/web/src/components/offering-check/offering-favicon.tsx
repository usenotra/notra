"use client";

import { cn } from "@notra/ui/lib/utils";
import Image from "next/image";
import { useState } from "react";

import { OFFERING_CHECK_FAVICON_SIZE } from "@/constants/offering-check";
import type { OfferingFaviconProps } from "@/types/offering-check";

export function OfferingFavicon({ domain, className }: OfferingFaviconProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        aria-hidden
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-md bg-[#1E1E1E0A] font-sans text-[0.6875rem]/4 font-medium text-[#1E1E1E99] uppercase dark:bg-white/[0.08] dark:text-white/50",
          className
        )}
      >
        {domain.charAt(0)}
      </span>
    );
  }

  return (
    <Image
      alt=""
      aria-hidden
      className={cn("size-5 shrink-0 rounded-md", className)}
      height={OFFERING_CHECK_FAVICON_SIZE}
      onError={() => setFailed(true)}
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${OFFERING_CHECK_FAVICON_SIZE}`}
      width={OFFERING_CHECK_FAVICON_SIZE}
    />
  );
}
