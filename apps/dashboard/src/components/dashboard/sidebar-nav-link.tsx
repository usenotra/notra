"use client";

import type { ComponentProps } from "react";

import Link from "@/components/framework/link";

/**
 * Sidebar links preload on intent from the first render. Toggling preload on
 * at hover time did nothing for that first hover: the router binds its hover
 * handler while preload is still off.
 */
export function SidebarNavLink({
  disablePrefetch = false,
  ...props
}: Omit<ComponentProps<typeof Link>, "prefetch"> & {
  /** Keep prefetch off even on hover. Org-root Studio home redirects to GEO. */
  disablePrefetch?: boolean;
}) {
  return <Link {...props} prefetch={disablePrefetch ? false : null} />;
}
