import type { AnchorHTMLAttributes, ComponentType } from "react";

export interface DashboardLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  prefetch?: boolean | null;
  replace?: boolean;
  scroll?: boolean;
}

export interface LazyComponentOptions {
  ssr?: boolean;
  loading?: ComponentType;
}
