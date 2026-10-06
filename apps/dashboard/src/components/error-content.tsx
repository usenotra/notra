"use client";

import { cn } from "@notra/ui/lib/utils";
import { useEffect } from "react";

import { buttonVariants } from "@/components/button";
import Link from "@/components/framework/link";
import { DEFAULT_ERROR_CONTENT_COPY } from "@/constants/error-content";
import { trackClientException } from "@/lib/analytics/posthog-client";
import type { ErrorContentProps } from "@/types/components/error";

export function ErrorContent({
  error,
  reset,
  className,
  copy = DEFAULT_ERROR_CONTENT_COPY,
}: ErrorContentProps) {
  useEffect(() => {
    trackClientException(error, { digest: error.digest });
  }, [error]);

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center px-4",
        className
      )}
    >
      <div className="text-center">
        <p className="text-muted-foreground text-sm font-medium">
          {copy.eyebrow}
        </p>
        <h1 className="text-foreground mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          {copy.title}
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-md text-base">
          {copy.description}
        </p>
        {error.digest ? (
          <p className="text-muted-foreground mt-2 font-mono text-xs">
            {copy.reference(error.digest)}
          </p>
        ) : null}
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            className={cn(buttonVariants())}
            onClick={() => reset()}
            type="button"
          >
            {copy.tryAgain}
          </button>
          <Link className={cn(buttonVariants({ variant: "outline" }))} href="/">
            {copy.goHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
