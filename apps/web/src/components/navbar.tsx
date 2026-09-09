"use client";

import {
  Cancel01Icon,
  Copy01Icon,
  Download01Icon,
  Menu02Icon,
  PaintBoardIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { TRANSITION, tween } from "@notra/ui/lib/motion";
import { cn } from "@notra/ui/lib/utils";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AUTH_APP_HOTKEY,
  AUTH_DASHBOARD_URL,
  AUTH_SIGNIN_HOTKEY,
  AUTH_SIGNIN_URL,
} from "@/constants/auth";
import {
  NAVBAR_DESKTOP_SIGNUP_SOURCE,
  NAVBAR_MOBILE_SIGNUP_SOURCE,
} from "@/constants/navbar";
import { useDashboardSession } from "@/lib/auth/use-dashboard-session";
import { useNavbarAuthHotkeys } from "@/lib/auth/use-navbar-auth-hotkeys";
import { BRAND_ASSETS } from "@/lib/brand/constants";
import { getNavbarVariantForPath } from "@/lib/navigation/navbar-variant";
import type {
  NavbarAuthActionsProps,
  NavbarKbdProps,
  NavbarProps,
  NavbarVariant,
} from "@/types/navbar";
import { copySvgAsset } from "@/utils/copy-svg-asset";
import { copyToClipboard } from "@/utils/copy-to-clipboard";
import {
  MARKETING_NAV,
  type MarketingNavCard,
  type MarketingNavGroup,
  type MarketingNavRailItem,
} from "@/utils/navigation";

import { NotraMark, notraMarkSvgString } from "./notra-mark";
import { ThemeToggle } from "./theme-toggle";
import { TrackedSignupLink } from "./tracked-signup-link";

const HOVER_CLOSE_DELAY = 120;
const CONTENT_SLIDE = 48;
const PANEL_PERSPECTIVE = 2000;
const PANEL_SCALE_IN = {
  opacity: 0,
  rotateX: -30,
  scale: 0.9,
} as const;
const PANEL_SCALE_OUT = {
  opacity: 0,
  rotateX: -10,
  scale: 0.95,
} as const;
const PANEL_SCALE_REST = {
  opacity: 1,
  rotateX: 0,
  scale: 1,
} as const;
const ENTER_EXIT_TRANSITION = TRANSITION.enter;
const MORPH_TRANSITION = tween("slow", "emphasized");
const SHELL_TRANSITION = tween("slow", "emphasized");
const SCROLL_THRESHOLD = 64;
const MOBILE_SCROLL_THRESHOLD = 16;
const MOBILE_MEDIA_QUERY = "(max-width: 63.9375rem)";
const ISLAND_CHROME =
  "bg-white shadow-[0_0.125rem_1.25rem_#1E1E1E14,0_0.0625rem_0.125rem_#28282814] ring-1 ring-[#1E1E1E14] dark:bg-neutral-950 dark:shadow-black/50 dark:ring-white/10";
const SWAP_TRANSITION = TRANSITION.fade;
const contentVariants = {
  enter: (direction: number) => ({
    x: direction * CONTENT_SLIDE,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction * -CONTENT_SLIDE,
    opacity: 0,
  }),
};

interface PanelSize {
  width: number;
  height: number;
}

function MegaCard({
  card,
  onSelect,
}: {
  card: MarketingNavCard;
  onSelect: () => void;
}) {
  const className =
    "flex h-52.5 w-52 shrink-0 cursor-pointer flex-col items-stretch justify-between rounded-2xl border border-[#1E1E1E1A] bg-[#C8B2EE40] p-6 shadow-[0_0_0_0.0625rem_#ECECEC,0_0.0625rem_0.125rem_#28282814] transition-[background,border-color] hover:bg-[linear-gradient(180deg,#C8B2EE40_0%,#C8B2EE66_100%)] dark:border-white/10 dark:bg-white/5 dark:shadow-none dark:hover:bg-white/10 dark:hover:bg-none";
  const body = (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center leading-none [&_svg]:block">
        <HugeiconsIcon
          className="size-8 text-[#1E1E1E] dark:text-white"
          icon={card.icon}
        />
      </span>
      <span className="flex flex-col items-start gap-0.75">
        <span className="h-5 w-full font-sans text-base leading-5 font-semibold whitespace-nowrap text-[#1E1E1E] dark:text-white">
          {card.label}
        </span>
        <span className="min-h-[3.375rem] self-stretch font-sans text-sm leading-[1.125rem] font-semibold text-[#1E1E1EBF] dark:text-neutral-400">
          {card.description}
        </span>
      </span>
    </>
  );

  if (card.external) {
    return (
      <a
        className={className}
        href={card.href}
        onClick={onSelect}
        rel="noopener noreferrer"
        role="menuitem"
        target="_blank"
      >
        {body}
      </a>
    );
  }

  return (
    <Link
      className={className}
      href={card.href}
      onClick={onSelect}
      role="menuitem"
    >
      {body}
    </Link>
  );
}

function RailItem({
  item,
  onSelect,
}: {
  item: MarketingNavRailItem;
  onSelect: () => void;
}) {
  const className =
    "-mx-2 -my-1.5 flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#C8B2EE26] focus-visible:bg-[#C8B2EE26] focus-visible:outline-none dark:hover:bg-white/6 dark:focus-visible:bg-white/6";
  const body = (
    <>
      <HugeiconsIcon
        className="size-6 shrink-0 text-[#1E1E1E] dark:text-neutral-200"
        icon={item.icon}
      />
      <span className="font-sans text-base leading-[1.5625rem] font-medium tracking-[-0.02em] text-[#1E1E1E] dark:text-neutral-200">
        {item.label}
      </span>
    </>
  );

  if (item.external) {
    return (
      <a
        className={className}
        href={item.href}
        onClick={onSelect}
        rel="noopener noreferrer"
        role="menuitem"
        target="_blank"
      >
        {body}
      </a>
    );
  }

  return (
    <Link
      className={className}
      href={item.href}
      onClick={onSelect}
      role="menuitem"
    >
      {body}
    </Link>
  );
}

function MegaPanel({
  group,
  onSelect,
}: {
  group: MarketingNavGroup;
  onSelect: () => void;
}) {
  return (
    <div className="flex items-stretch justify-end gap-8">
      <div className="flex items-stretch gap-4 py-8 pl-8">
        {group.cards.map((card) => (
          <MegaCard card={card} key={card.href} onSelect={onSelect} />
        ))}
      </div>
      {group.rail.length > 0 && (
        <div className="flex flex-col items-start justify-end self-stretch border-l border-[#1E1E1E1A] p-8 dark:border-white/10">
          <div className="flex flex-col gap-3">
            {group.rail.map((item) => (
              <RailItem item={item} key={item.href} onSelect={onSelect} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getSlideDirection(
  groups: MarketingNavGroup[],
  activeGroup: string | null,
  previousGroup: string | null
) {
  if (!(activeGroup && previousGroup) || activeGroup === previousGroup) {
    return 0;
  }

  const currentIndex = groups.findIndex((group) => group.label === activeGroup);
  const previousIndex = groups.findIndex(
    (group) => group.label === previousGroup
  );

  if (currentIndex === -1 || previousIndex === -1) {
    return 0;
  }

  return currentIndex > previousIndex ? 1 : -1;
}

function getNavbarPresentation(
  variant: NavbarVariant,
  scrolled: boolean,
  reduceMotion: boolean
) {
  const isLanding = variant === "landing";
  const tracksScroll = variant === "island" || isLanding;
  const chrome = variant === "pinned" || (tracksScroll && scrolled);
  const isLandingTop = isLanding && !chrome;
  let positionClass = "w-full sticky top-4";

  if (isLanding) {
    positionClass = "fixed inset-x-4 sm:inset-x-6";
  } else if (variant === "static") {
    positionClass = "w-full";
  }

  return {
    chrome,
    contentTransition: reduceMotion ? { duration: 0 } : SWAP_TRANSITION,
    enterExitTransition: reduceMotion ? { duration: 0 } : ENTER_EXIT_TRANSITION,
    innerPaddingClass: isLandingTop
      ? "px-7 sm:px-5 lg:px-6 min-[87rem]:px-0"
      : "px-4 sm:px-6",
    isLandingTop,
    morphTransition: reduceMotion ? { duration: 0 } : MORPH_TRANSITION,
    positionClass,
    rowHeightClass: isLandingTop ? "h-11 lg:h-[2.4375rem]" : "h-16",
    shellAnimate: isLanding
      ? {
          maxWidth: chrome ? "64rem" : "80.9375rem",
          top: chrome ? "1rem" : "2.5rem",
        }
      : { maxWidth: chrome ? "64rem" : "80rem" },
    shellTransition: reduceMotion ? { duration: 0 } : SHELL_TRANSITION,
  };
}

export function Navbar({ variant }: NavbarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const resolvedVariant = variant ?? getNavbarVariantForPath(pathname);

  const [isOpen, setIsOpen] = useState(false);
  const [{ active: activeGroup, previous: previousGroup }, setNavGroup] =
    useState<{ active: string | null; previous: string | null }>({
      active: null,
      previous: null,
    });
  const [panelSizes, setPanelSizes] = useState<Map<string, PanelSize>>(
    new Map()
  );
  const triggerRefs = useRef(new Map<string, HTMLButtonElement>());
  const measureRefs = useRef(new Map<string, HTMLDivElement>());
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setActiveGroup = useCallback((next: string | null) => {
    setNavGroup((current) => {
      if (current.active === next) {
        return current;
      }
      return { active: next, previous: current.active };
    });
  }, []);

  const groups = useMemo<MarketingNavGroup[]>(
    () =>
      MARKETING_NAV.filter(
        (entry): entry is MarketingNavGroup => entry.type === "group"
      ),
    []
  );

  const { isAuthenticated, isResolved } = useDashboardSession();
  useNavbarAuthHotkeys({ isAuthenticated, isResolved });

  useEffect(() => {
    if (!isResolved) {
      return;
    }

    if (!isAuthenticated) {
      if (pathname === "/home" || pathname === "/landing") {
        // Keep the resolved session in this shared layout to avoid redirect loops.
        router.replace(`/${window.location.search}${window.location.hash}`);
      }
      return;
    }

    if (pathname === "/") {
      window.location.replace(
        process.env.NODE_ENV === "development"
          ? "http://localhost:3000/callback"
          : AUTH_DASHBOARD_URL
      );
    }
  }, [pathname, router, isResolved, isAuthenticated]);

  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [logoMenuOpen, setLogoMenuOpen] = useState(false);

  const getScrollThreshold = useCallback(
    () =>
      window.matchMedia(MOBILE_MEDIA_QUERY).matches
        ? MOBILE_SCROLL_THRESHOLD
        : SCROLL_THRESHOLD,
    []
  );

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > getScrollThreshold());
  });

  useEffect(() => {
    // react-doctor-disable-next-line react-hooks-js/set-state-in-effect
    setScrolled(window.scrollY > getScrollThreshold());
  }, [getScrollThreshold]);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      setActiveGroup(null);
    }, HOVER_CLOSE_DELAY);
  }, [cancelClose, setActiveGroup]);

  const openGroup = useCallback(
    (label: string) => {
      cancelClose();
      setActiveGroup(label);
    },
    [cancelClose, setActiveGroup]
  );

  const closePanel = useCallback(() => setActiveGroup(null), [setActiveGroup]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    function handleKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveGroup(null);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [setActiveGroup]);

  useEffect(() => {
    const nodes = measureRefs.current;
    if (nodes.size === 0) {
      return;
    }
    const observer = new ResizeObserver(() => {
      const next = new Map<string, PanelSize>();
      for (const [label, node] of nodes) {
        const rect = node.getBoundingClientRect();
        next.set(label, { width: rect.width, height: rect.height });
      }
      setPanelSizes(next);
    });
    for (const node of nodes.values()) {
      observer.observe(node);
    }
    return () => observer.disconnect();
  }, []);

  const activeGroupData = activeGroup
    ? groups.find((group) => group.label === activeGroup)
    : null;
  const activeSize = activeGroup ? panelSizes.get(activeGroup) : undefined;

  const slideDirection = getSlideDirection(groups, activeGroup, previousGroup);
  const direction = reduceMotion ? 0 : slideDirection;
  const {
    chrome,
    contentTransition,
    enterExitTransition,
    innerPaddingClass,
    isLandingTop,
    morphTransition,
    positionClass,
    rowHeightClass,
    shellAnimate,
    shellTransition,
  } = getNavbarPresentation(resolvedVariant, scrolled, reduceMotion ?? false);
  const mutedNavClass =
    "text-[#1E1E1EA6] hover:text-[#1E1E1E] dark:text-neutral-400 dark:hover:text-white";

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        animate={shellAnimate}
        className={`z-50 mx-auto ${positionClass}`}
        initial={false}
        transition={shellTransition}
      >
        <m.header
          animate={{ borderRadius: chrome ? "1rem" : "0rem" }}
          className={`duration-slow transition-[background-color,box-shadow] ease-out ${
            chrome ? ISLAND_CHROME : "bg-transparent"
          }`}
          initial={false}
          transition={shellTransition}
        >
          <div
            className={`max-lg:duration-slow max-lg:transition-[padding] max-lg:ease-out ${innerPaddingClass}`}
          >
            {/* biome-ignore lint/a11y/noStaticElementInteractions: onMouseLeave is a pointer-only convenience to dismiss the hover menu; the menu is fully operable via click, focus, and Escape */}
            {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: see above */}
            <div
              className={`max-lg:duration-slow relative flex items-center justify-between gap-4 max-lg:transition-[height] max-lg:ease-out ${rowHeightClass}`}
              onMouseLeave={scheduleClose}
            >
              <DropdownMenu
                onOpenChange={(open, details) => {
                  if (open && details.reason === "trigger-press") {
                    return;
                  }
                  if (!open && details.reason === "trigger-hover") {
                    return;
                  }
                  setLogoMenuOpen(open);
                }}
                open={logoMenuOpen}
              >
                <DropdownMenuTrigger
                  nativeButton={false}
                  render={
                    <Link
                      aria-label="Notra home"
                      className="group flex flex-1 items-center"
                      href="/"
                      onContextMenu={(event) => {
                        event.preventDefault();
                        setLogoMenuOpen(true);
                      }}
                    />
                  }
                >
                  <span className="duration-fast inline-flex origin-left items-center gap-2 transition-transform ease-out group-active:scale-95">
                    <span className="flex size-10 items-center justify-center rounded-lg dark:bg-[#F6F3F1] dark:shadow-sm dark:ring-1 dark:inset-shadow-sm dark:shadow-black/40 dark:ring-white/10 dark:inset-shadow-white/8">
                      <NotraMark className="size-7 shrink-0" />
                    </span>
                    <span className="text-lg font-semibold text-neutral-950 dark:text-white">
                      Notra
                    </span>
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-56"
                  side="bottom"
                >
                  <DropdownMenuItem
                    onClick={() =>
                      copyToClipboard(notraMarkSvgString, "Copied logo as SVG")
                    }
                  >
                    <HugeiconsIcon icon={Copy01Icon} />
                    Copy logo as SVG
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      copySvgAsset(
                        BRAND_ASSETS.wordmark.svg,
                        "Copied wordmark as SVG"
                      )
                    }
                  >
                    <HugeiconsIcon icon={Copy01Icon} />
                    Copy wordmark as SVG
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    render={
                      <a download href={BRAND_ASSETS.zip}>
                        <HugeiconsIcon icon={Download01Icon} />
                        Download brand kit
                      </a>
                    }
                  />
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<Link href="/brand" />}>
                    <HugeiconsIcon icon={PaintBoardIcon} />
                    Brand Guidelines
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <nav className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-8 lg:flex">
                {MARKETING_NAV.map((entry) => {
                  if (entry.type === "link") {
                    return (
                      <Link
                        className={`duration-fast font-sans text-base leading-5 tracking-[-0.02em] transition-colors ease-out ${mutedNavClass}`}
                        href={entry.href}
                        key={entry.href}
                        onFocus={() => setActiveGroup(null)}
                        onMouseEnter={() => {
                          cancelClose();
                          setActiveGroup(null);
                        }}
                      >
                        {entry.label}
                      </Link>
                    );
                  }
                  const isActive = activeGroup === entry.label;
                  return (
                    <button
                      aria-expanded={isActive}
                      aria-haspopup="menu"
                      className={`duration-fast inline-flex cursor-pointer items-center gap-1 font-sans text-base leading-5 tracking-[-0.02em] transition-colors ease-out aria-expanded:text-[#1E1E1E] dark:aria-expanded:text-white ${mutedNavClass}`}
                      key={entry.label}
                      onClick={() =>
                        setActiveGroup(isActive ? null : entry.label)
                      }
                      onFocus={() => openGroup(entry.label)}
                      onMouseEnter={() => openGroup(entry.label)}
                      ref={(node) => {
                        if (node) {
                          triggerRefs.current.set(entry.label, node);
                        } else {
                          triggerRefs.current.delete(entry.label);
                        }
                      }}
                      type="button"
                    >
                      {entry.label}
                      <ChevronIcon flipped={isActive} />
                    </button>
                  );
                })}

                <div
                  aria-hidden="true"
                  className="pointer-events-none invisible absolute top-full left-0 -z-10 size-0 overflow-hidden"
                >
                  {groups.map((group) => (
                    <div
                      className="w-max"
                      key={group.label}
                      ref={(node) => {
                        if (node) {
                          measureRefs.current.set(group.label, node);
                        } else {
                          measureRefs.current.delete(group.label);
                        }
                      }}
                    >
                      <MegaPanel group={group} onSelect={closePanel} />
                    </div>
                  ))}
                </div>

                <AnimatePresence>
                  {activeGroupData && (
                    <m.div
                      animate={{ ...PANEL_SCALE_REST, x: "-50%" }}
                      className="absolute top-full left-1/2 z-50 pt-2"
                      exit={{ ...PANEL_SCALE_OUT, x: "-50%" }}
                      initial={{ ...PANEL_SCALE_IN, x: "-50%" }}
                      key="navbar-dropdown"
                      style={{
                        transformPerspective: PANEL_PERSPECTIVE,
                        transformOrigin: "top center",
                      }}
                      transition={enterExitTransition}
                    >
                      <m.div
                        animate={{
                          width: activeSize?.width,
                          height: activeSize?.height,
                        }}
                        className="relative"
                        initial={{
                          width: activeSize?.width,
                          height: activeSize?.height,
                        }}
                        transition={{
                          width: morphTransition,
                          height: morphTransition,
                        }}
                      >
                        <div className="relative h-full w-full overflow-hidden rounded-3xl bg-[linear-gradient(180deg,#FFFFFF_0%,#F3F3F3_100%)] shadow-[0_0.125rem_2.0625rem_#1E1E1E1A,0_0_0_0.0625rem_#ECECEC,0_0.0625rem_0.125rem_#28282814] ring-1 ring-[#1E1E1E0D] dark:bg-neutral-950 dark:bg-none dark:shadow-black/50 dark:ring-white/10">
                          <AnimatePresence custom={direction} initial={false}>
                            <m.div
                              animate="center"
                              className="absolute top-0 left-0 w-max"
                              custom={direction}
                              exit="exit"
                              initial="enter"
                              key={activeGroupData.label}
                              role="menu"
                              transition={contentTransition}
                              variants={contentVariants}
                            >
                              <MegaPanel
                                group={activeGroupData}
                                onSelect={closePanel}
                              />
                            </m.div>
                          </AnimatePresence>
                        </div>
                      </m.div>
                    </m.div>
                  )}
                </AnimatePresence>
              </nav>

              <div className="flex flex-1 items-center justify-end gap-2 lg:gap-3">
                <ThemeToggle />
                <DesktopAuthActions
                  isAuthenticated={isAuthenticated}
                  isResolved={isResolved}
                />
                <button
                  aria-controls="mobile-navigation"
                  aria-expanded={isOpen}
                  aria-label={isOpen ? "Close menu" : "Open menu"}
                  className="relative inline-flex size-9 items-center justify-center rounded-md text-[#1E1E1E] hover:bg-[#C8B2EE26] lg:hidden dark:text-white dark:hover:bg-white/6"
                  onClick={() => setIsOpen((prev) => !prev)}
                  type="button"
                >
                  <HugeiconsIcon
                    className="size-5"
                    icon={isOpen ? Cancel01Icon : Menu02Icon}
                  />
                </button>
              </div>
            </div>
          </div>
        </m.header>

        <AnimatePresence>
          {isOpen && (
            <m.div
              animate={{ opacity: 1, y: 0 }}
              className={`absolute top-[calc(100%+0.5rem)] z-40 max-h-[calc(100dvh-6.5rem)] overflow-y-auto overscroll-contain rounded-2xl bg-white p-3 pb-[max(1.75rem,env(safe-area-inset-bottom))] shadow-[0_0.125rem_2.0625rem_#1E1E1E1A,0_0.0625rem_0.125rem_#28282814] ring-1 ring-[#1E1E1E14] lg:hidden dark:bg-neutral-950 dark:shadow-black/50 dark:ring-white/10 ${isLandingTop ? "inset-x-6" : "inset-x-4"}`}
              exit={{ opacity: 0, y: -6 }}
              id="mobile-navigation"
              initial={{ opacity: 0, y: -6 }}
              transition={enterExitTransition}
            >
              <MobileNav
                isAuthenticated={isAuthenticated}
                isResolved={isResolved}
                onNavigate={() => setIsOpen(false)}
              />
            </m.div>
          )}
        </AnimatePresence>
      </m.div>
    </LazyMotion>
  );
}

function MobileNav({
  isAuthenticated,
  isResolved,
  onNavigate,
}: NavbarAuthActionsProps & { onNavigate: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <nav className="flex flex-col gap-1">
        {MARKETING_NAV.map((entry) => {
          if (entry.type === "link") {
            return (
              <Link
                className="rounded-md px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-300 dark:hover:bg-white/6 dark:hover:text-white"
                href={entry.href}
                key={entry.href}
                onClick={onNavigate}
              >
                {entry.label}
              </Link>
            );
          }
          return (
            <div className="flex flex-col gap-0.5" key={entry.label}>
              <div className="px-3 pt-2 pb-1 text-xs font-medium tracking-wide text-neutral-400 uppercase dark:text-neutral-500">
                {entry.label}
              </div>
              {[...entry.cards, ...entry.rail].map((item) =>
                item.external ? (
                  <a
                    className="rounded-md px-3 py-2 font-sans text-sm text-[#1E1E1E] hover:bg-[#C8B2EE26] dark:text-neutral-300 dark:hover:bg-white/6"
                    href={item.href}
                    key={item.href}
                    onClick={onNavigate}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    className="rounded-md px-3 py-2 font-sans text-sm text-[#1E1E1E] hover:bg-[#C8B2EE26] dark:text-neutral-300 dark:hover:bg-white/6"
                    href={item.href}
                    key={item.href}
                    onClick={onNavigate}
                  >
                    {item.label}
                  </Link>
                )
              )}
            </div>
          );
        })}
      </nav>
      <div className="flex flex-col gap-2 border-t border-[#1E1E1E14] pt-3 dark:border-white/10">
        <MobileAuthActions
          isAuthenticated={isAuthenticated}
          isResolved={isResolved}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}

function MobileAuthActions({
  isAuthenticated,
  isResolved,
  onNavigate,
}: NavbarAuthActionsProps & { onNavigate: () => void }) {
  if (!isResolved) {
    return null;
  }

  if (isAuthenticated) {
    return (
      <Link
        className="cta-gradient-primary font-display rounded-full px-3 py-2.5 text-center text-sm font-medium tracking-[-0.015em] text-white"
        href={AUTH_DASHBOARD_URL}
        onClick={onNavigate}
      >
        Dashboard
      </Link>
    );
  }

  return (
    <>
      <Link
        className="font-display rounded-md px-3 py-2 text-center text-sm tracking-[-0.015em] text-[#1E1E1E] hover:bg-[#C8B2EE26] dark:text-neutral-300 dark:hover:bg-white/6"
        href={AUTH_SIGNIN_URL}
        onClick={onNavigate}
      >
        Sign In
      </Link>
      <TrackedSignupLink
        className="cta-gradient-primary font-display rounded-full px-3 py-2.5 text-center text-sm font-medium tracking-[-0.015em] text-white"
        onClick={onNavigate}
        source={NAVBAR_MOBILE_SIGNUP_SOURCE}
      >
        Sign Up
      </TrackedSignupLink>
    </>
  );
}

const SIGNUP_BUTTON_CLASS =
  "corner-squircle inline-flex h-8 items-center gap-1.5 rounded-[1rem] bg-white ps-2.5 pe-1.5 font-display text-sm leading-[1.14] font-semibold tracking-[-0.015em] text-[#1E1E1E] shadow-[0_0_0_1px_#ececec,0_1px_2px_#28282814] outline-none transition-[opacity,transform,box-shadow] duration-fast ease-out hover:opacity-90 focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.96] supports-[corner-shape:round]:rounded-[1.25rem] dark:bg-white";

function DesktopAuthActions({
  isAuthenticated,
  isResolved,
}: NavbarAuthActionsProps) {
  if (!isResolved) {
    return <div aria-hidden="true" className="hidden h-8 lg:block" />;
  }

  if (isAuthenticated) {
    return (
      <div className="hidden items-center gap-3 lg:flex">
        <Link
          aria-keyshortcuts={AUTH_APP_HOTKEY.toLowerCase()}
          className={SIGNUP_BUTTON_CLASS}
          href={AUTH_DASHBOARD_URL}
        >
          Dashboard
          <NavbarKbd onLight>{AUTH_APP_HOTKEY}</NavbarKbd>
        </Link>
      </div>
    );
  }

  return (
    <div className="hidden items-center gap-3 lg:flex">
      <Link
        aria-keyshortcuts={AUTH_SIGNIN_HOTKEY.toLowerCase()}
        className="font-display duration-fast inline-flex items-center gap-1.5 text-base leading-[1.14] tracking-[-0.015em] text-[#1E1E1E] transition-opacity ease-out hover:opacity-70 dark:text-white"
        href={AUTH_SIGNIN_URL}
      >
        Sign In
        <NavbarKbd>{AUTH_SIGNIN_HOTKEY}</NavbarKbd>
      </Link>
      <TrackedSignupLink
        aria-keyshortcuts={AUTH_APP_HOTKEY.toLowerCase()}
        className={SIGNUP_BUTTON_CLASS}
        source={NAVBAR_DESKTOP_SIGNUP_SOURCE}
      >
        Sign Up
        <NavbarKbd onLight>{AUTH_APP_HOTKEY}</NavbarKbd>
      </TrackedSignupLink>
    </div>
  );
}

function NavbarKbd({ children, onLight = false }: NavbarKbdProps) {
  return (
    <Kbd
      aria-hidden="true"
      className={cn(
        "h-5 min-w-5 rounded-md font-sans text-[0.6875rem] font-medium",
        onLight
          ? "bg-[#1E1E1E0F] text-[#1E1E1E99]"
          : "bg-[#1E1E1E0F] text-[#1E1E1E99] dark:bg-white/10 dark:text-white/50"
      )}
    >
      {children}
    </Kbd>
  );
}

function ChevronIcon({ flipped }: { flipped: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`duration-normal size-3.5 transition-transform ${flipped ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M6 9l6 6l6 -6" />
    </svg>
  );
}
