"use client";

import type { ComponentProps } from "react";
import { useState } from "react";

import Link from "@/components/framework/link";

export function SidebarNavLink({
  href,
  onFocus,
  onMouseEnter,
  eagerPrefetch = false,
  disablePrefetch = false,
  ...props
}: Omit<ComponentProps<typeof Link>, "prefetch"> & {
  eagerPrefetch?: boolean;
  /** Keep prefetch off even on hover. Org-root Studio home redirects to GEO. */
  disablePrefetch?: boolean;
}) {
  const [hoverPrefetch, setHoverPrefetch] = useState<false | null>(false);
  let prefetch: false | null = hoverPrefetch;
  if (disablePrefetch) {
    prefetch = false;
  } else if (eagerPrefetch) {
    prefetch = null;
  }

  function enablePrefetch() {
    if (disablePrefetch) {
      return;
    }
    setHoverPrefetch(null);
  }

  return (
    <Link
      {...props}
      href={href}
      onFocus={(event) => {
        enablePrefetch();
        onFocus?.(event);
      }}
      onMouseEnter={(event) => {
        enablePrefetch();
        onMouseEnter?.(event);
      }}
      prefetch={prefetch}
    />
  );
}
