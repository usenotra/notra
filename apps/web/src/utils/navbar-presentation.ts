import type {
  NavbarChromePresentation,
  NavbarMobileOverlayLayout,
  NavbarVariant,
} from "@/types/navbar";

const FLOATING_ROW = "h-11 lg:h-[2.4375rem]";
const CHROME_ROW = "h-16";
const CHROME_PADDING = "px-4 sm:px-6";
const ISLAND_MAX_WIDTH = "64rem";

interface NavbarVariantSpec {
  positionClass: string;
  overlayLayout: NavbarMobileOverlayLayout;
  tracksScroll: boolean;
  pinnedChrome: boolean;
  canFloat: boolean;
  floatsShell: boolean;
  floatingPadding: string;
  floatingTop: string;
  expandedMaxWidth: string;
}

const NAVBAR_VARIANT_SPEC: Record<NavbarVariant, NavbarVariantSpec> = {
  island: {
    positionClass: "w-full sticky top-4",
    overlayLayout: "hero",
    tracksScroll: true,
    pinnedChrome: false,
    canFloat: false,
    floatsShell: false,
    floatingPadding: CHROME_PADDING,
    floatingTop: "1rem",
    expandedMaxWidth: "80rem",
  },
  landing: {
    positionClass: "fixed inset-x-4 sm:inset-x-6",
    overlayLayout: "hero",
    tracksScroll: true,
    pinnedChrome: false,
    canFloat: true,
    floatsShell: true,
    floatingPadding: "px-7 sm:px-5 lg:px-6 min-[87rem]:px-0",
    floatingTop: "2.5rem",
    expandedMaxWidth: "80.9375rem",
  },
  page: {
    positionClass: "fixed inset-x-3 sm:inset-x-4",
    overlayLayout: "compact",
    tracksScroll: true,
    pinnedChrome: false,
    canFloat: true,
    floatsShell: true,
    floatingPadding: "px-4 sm:px-5",
    floatingTop: "1rem",
    expandedMaxWidth: "80.9375rem",
  },
  pinned: {
    positionClass: "w-full sticky top-4",
    overlayLayout: "hero",
    tracksScroll: false,
    pinnedChrome: true,
    canFloat: false,
    floatsShell: false,
    floatingPadding: CHROME_PADDING,
    floatingTop: "1rem",
    expandedMaxWidth: "80rem",
  },
  static: {
    positionClass: "w-full",
    overlayLayout: "hero",
    tracksScroll: false,
    pinnedChrome: false,
    canFloat: false,
    floatsShell: false,
    floatingPadding: CHROME_PADDING,
    floatingTop: "1rem",
    expandedMaxWidth: "80rem",
  },
};

export function getNavbarChromePresentation(
  variant: NavbarVariant,
  scrolled: boolean
): NavbarChromePresentation {
  const spec = NAVBAR_VARIANT_SPEC[variant];
  const chrome = spec.pinnedChrome || (spec.tracksScroll && scrolled);
  const floating = spec.canFloat && !chrome;

  return {
    chrome,
    innerPaddingClass: floating ? spec.floatingPadding : CHROME_PADDING,
    overlayLayout: spec.overlayLayout,
    positionClass: spec.positionClass,
    rowHeightClass: floating ? FLOATING_ROW : CHROME_ROW,
    shellAnimate: spec.floatsShell
      ? {
          maxWidth: chrome ? ISLAND_MAX_WIDTH : spec.expandedMaxWidth,
          top: chrome ? "1rem" : spec.floatingTop,
        }
      : { maxWidth: chrome ? ISLAND_MAX_WIDTH : spec.expandedMaxWidth },
  };
}
