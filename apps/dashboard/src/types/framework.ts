import type { AnchorHTMLAttributes, ComponentType, ReactNode } from "react";

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

export interface ChunkLoadBoundaryProps {
  children: ReactNode;
}

export interface ChunkLoadBoundaryState {
  error: unknown;
}
