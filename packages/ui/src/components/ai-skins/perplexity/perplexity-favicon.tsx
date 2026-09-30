"use client";

import { cn } from "@notra/ui/lib/utils";
import Image from "next/image";
import { useState } from "react";

export function perplexityFaviconSrc(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

export function PerplexityFavicon({
  domain,
  className,
}: {
  domain: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        aria-hidden
        className={cn("inline-block rounded-full bg-[#e8e8e8] dark:bg-white/12", className)}
      />
    );
  }

  return (
    <Image
      alt=""
      className={cn("rounded-full bg-[#e8e8e8] dark:bg-white/12", className)}
      height={64}
      onError={() => setFailed(true)}
      src={perplexityFaviconSrc(domain)}
      unoptimized
      width={64}
    />
  );
}
