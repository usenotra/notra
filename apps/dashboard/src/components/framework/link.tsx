import { Link as RouterLink, useLocation } from "@tanstack/react-router";
import { forwardRef } from "react";

import type { DashboardLinkProps } from "@/types/framework";
import { modalNavigationOptions } from "@/utils/route-modal";

const Link = forwardRef<HTMLAnchorElement, DashboardLinkProps>(function Link(
  { href, prefetch, replace, scroll, children, ...props },
  ref
) {
  const location = useLocation();
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(href)) {
    return (
      <a {...props} href={href} ref={ref}>
        {children}
      </a>
    );
  }
  const url = new URL(href, "http://localhost");
  const navigation = modalNavigationOptions(location, href) ?? {
    to: url.pathname,
    search: Object.fromEntries(url.searchParams),
    hash: url.hash.slice(1),
    resetScroll: scroll ?? true,
  };
  return (
    <RouterLink
      {...props}
      {...navigation}
      preload={prefetch === false ? false : "intent"}
      ref={ref}
      replace={replace}
    >
      {children}
    </RouterLink>
  );
});

export default Link;
