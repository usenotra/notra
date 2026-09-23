"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useState } from "react";

/**
 * Sidebar destinations stay in the viewport (both GEO and Studio panels stay
 * mounted for the mode swoosh). Viewport prefetch would compile and fetch
 * every route on first paint. Keep prefetch off until hover or focus, then
 * restore Link's default so Next.js prefetches the App Shell and keeps the
 * cache in sync. Mode-switch links pass `eagerPrefetch` so the inactive home
 * is already in the App Shell cache before the click.
 */
export function SidebarNavLink({
  href,
  onFocus,
  onMouseEnter,
  eagerPrefetch = false,
  ...props
}: Omit<ComponentProps<typeof Link>, "prefetch"> & {
  eagerPrefetch?: boolean;
}) {
  const [hoverPrefetch, setHoverPrefetch] = useState<false | null>(false);
  const prefetch = eagerPrefetch ? null : hoverPrefetch;

  function enablePrefetch() {
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
