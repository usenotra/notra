import type { Variants } from "motion/react";
import type { ReactNode } from "react";

import type { MarketingNavGroup } from "@/utils/navigation";

export type NavbarVariant = "island" | "landing" | "page" | "pinned" | "static";

export type NavbarMobileOverlayLayout = "compact" | "hero";

export interface NavbarProps {
  variant?: NavbarVariant;
}

export interface NavbarAuthActionsProps {
  isAuthenticated: boolean;
  isResolved: boolean;
}

export interface NavbarMobileMenuProps extends NavbarAuthActionsProps {
  open: boolean;
  onNavigate: () => void;
  overlayLayout: NavbarMobileOverlayLayout;
}

export interface NavbarMobileGroupProps {
  group: MarketingNavGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: () => void;
  item: Variants;
  stagger: Variants;
}

export interface NavbarKbdProps {
  children: string;
  onLight?: boolean;
}

export interface NavbarHrefProps {
  href: string;
  external?: boolean;
  className: string;
  onClick?: () => void;
  children: ReactNode;
  role?: string;
}

export interface NavbarChromePresentation {
  chrome: boolean;
  innerPaddingClass: string;
  overlayLayout: NavbarMobileOverlayLayout;
  positionClass: string;
  rowHeightClass: string;
  shellAnimate: { maxWidth: string; top?: string };
}
