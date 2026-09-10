"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@notra/ui/components/ui/collapsible";
import { TRANSITION, tween } from "@notra/ui/lib/motion";
import { cn } from "@notra/ui/lib/utils";
import {
  AnimatePresence,
  m,
  type Variants,
  useReducedMotion,
} from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AUTH_DASHBOARD_URL, AUTH_SIGNIN_URL } from "@/constants/auth";
import {
  NAVBAR_MOBILE_OVERLAY_LAYOUT,
  NAVBAR_MOBILE_SIGNUP_SOURCE,
} from "@/constants/navbar";
import type {
  NavbarAuthActionsProps,
  NavbarMobileGroupProps,
  NavbarMobileMenuProps,
} from "@/types/navbar";
import {
  MARKETING_NAV,
  type MarketingNavCard,
  type MarketingNavGroup,
  type MarketingNavRailItem,
} from "@/utils/navigation";

import { NavbarChevron } from "./navbar-glyphs";
import { NavbarHref } from "./navbar-href";
import { TrackedSignupLink } from "./tracked-signup-link";

const CARD_CLASSNAME =
  "flex min-w-0 items-start gap-3 rounded-2xl border border-[#1E1E1E1A] bg-[#C8B2EE40] px-3.5 py-3 shadow-[0_0_0_0.0625rem_#ECECEC,0_0.0625rem_0.125rem_#28282814] transition-[background,border-color,transform] hover:bg-[linear-gradient(180deg,#C8B2EE40_0%,#C8B2EE66_100%)] active:scale-[0.98] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none dark:border-white/10 dark:bg-white/5 dark:shadow-none dark:hover:bg-white/10 dark:hover:bg-none";

const RAIL_CLASSNAME =
  "flex min-h-9 items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#C8B2EE26] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none dark:hover:bg-white/6";

const TRIGGER_CLASSNAME =
  "flex min-h-14 w-full cursor-pointer items-center justify-between py-3 text-left font-sans text-[1.375rem] leading-none font-medium tracking-[-0.03em] text-[#1E1E1E] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none dark:text-white";

const PANEL_CLASSNAME = "overflow-hidden";

const AUTH_BUTTON_CLASSNAME =
  "font-display flex h-12 items-center justify-center rounded-full text-base tracking-[-0.015em]";

const STAGGER_IN = 0.028;
const STAGGER_OUT = 0.018;

const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      ...tween("normal", "emphasized"),
      delayChildren: 0.02,
      staggerChildren: 0.04,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      ...TRANSITION.exit,
      staggerChildren: STAGGER_OUT,
      staggerDirection: -1,
    },
  },
};

const staggerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: STAGGER_IN },
  },
  exit: {
    transition: { staggerChildren: STAGGER_OUT, staggerDirection: -1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: tween("fast", "emphasized"),
  },
  exit: {
    opacity: 0,
    y: 4,
    transition: TRANSITION.exit,
  },
};

const reducedOverlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0 } },
  exit: { opacity: 0, transition: { duration: 0 } },
};

const reducedItemVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0 } },
  exit: { opacity: 0, transition: { duration: 0 } },
};

export function NavbarMobileMenu({
  open,
  isAuthenticated,
  isResolved,
  overlayLayout,
  onNavigate,
}: NavbarMobileMenuProps) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const overlay = reduceMotion ? reducedOverlayVariants : overlayVariants;
  const stagger = reduceMotion ? reducedItemVariants : staggerVariants;
  const item = reduceMotion ? reducedItemVariants : itemVariants;
  const layout = NAVBAR_MOBILE_OVERLAY_LAYOUT[overlayLayout];

  useEffect(() => {
    if (!open) {
      setOpenGroup(null);
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <m.div
          animate="visible"
          aria-label="Navigation"
          aria-modal="true"
          className={cn(
            "pointer-events-none fixed inset-0 z-40 flex flex-col overflow-hidden overscroll-none bg-white lg:hidden dark:bg-neutral-950",
            layout.shell
          )}
          exit="exit"
          id="mobile-navigation"
          initial="hidden"
          role="dialog"
          variants={overlay}
        >
          <m.nav
            className={cn(
              "pointer-events-auto flex min-h-0 flex-1 [scrollbar-width:none] flex-col overflow-y-auto overscroll-contain pb-4 [&::-webkit-scrollbar]:hidden",
              layout.inset
            )}
            variants={stagger}
          >
            {MARKETING_NAV.map((entry) => {
              if (entry.type === "link") {
                return (
                  <m.div key={entry.href} variants={item}>
                    <Link
                      className={TRIGGER_CLASSNAME}
                      href={entry.href}
                      onClick={onNavigate}
                    >
                      {entry.label}
                    </Link>
                  </m.div>
                );
              }

              return (
                <m.div key={entry.label} variants={item}>
                  <GroupDropdown
                    group={entry}
                    item={item}
                    onOpenChange={(next) =>
                      setOpenGroup(next ? entry.label : null)
                    }
                    onSelect={onNavigate}
                    open={openGroup === entry.label}
                    stagger={stagger}
                  />
                </m.div>
              );
            })}
          </m.nav>

          <m.div
            className={cn(
              "pointer-events-auto flex shrink-0 flex-col gap-3 border-t border-[#1E1E1E14] bg-white pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] dark:border-white/10 dark:bg-neutral-950",
              layout.inset
            )}
            variants={stagger}
          >
            <MobileAuthActions
              isAuthenticated={isAuthenticated}
              isResolved={isResolved}
              item={item}
              onNavigate={onNavigate}
            />
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}

function GroupDropdown({
  group,
  open,
  onOpenChange,
  onSelect,
  stagger,
  item,
}: NavbarMobileGroupProps) {
  return (
    <Collapsible onOpenChange={onOpenChange} open={open}>
      <CollapsibleTrigger className={TRIGGER_CLASSNAME}>
        {group.label}
        <NavbarChevron
          className="size-5 shrink-0 text-[#1E1E1E73] duration-200 dark:text-white/50"
          flipped={open}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className={PANEL_CLASSNAME}>
        {open ? (
          <GroupPanel
            group={group}
            item={item}
            onSelect={onSelect}
            stagger={stagger}
          />
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}

function GroupPanel({
  group,
  onSelect,
  stagger,
  item,
}: {
  group: MarketingNavGroup;
  onSelect: () => void;
  stagger: Variants;
  item: Variants;
}) {
  return (
    <m.div
      animate="visible"
      className="flex flex-col gap-2 pt-1 pb-5"
      initial="hidden"
      variants={stagger}
    >
      <m.div className="flex flex-col gap-2" variants={stagger}>
        {group.cards.map((card) => (
          <m.div key={card.href} variants={item}>
            <MobileNavCard card={card} onSelect={onSelect} />
          </m.div>
        ))}
      </m.div>
      {group.rail.length > 0 ? (
        <m.div className="mt-1 flex flex-col" variants={stagger}>
          {group.rail.map((railItem) => (
            <m.div key={railItem.href} variants={item}>
              <MobileRailItem item={railItem} onSelect={onSelect} />
            </m.div>
          ))}
        </m.div>
      ) : null}
    </m.div>
  );
}

function MobileNavCard({
  card,
  onSelect,
}: {
  card: MarketingNavCard;
  onSelect: () => void;
}) {
  return (
    <NavbarHref
      className={CARD_CLASSNAME}
      external={card.external}
      href={card.href}
      onClick={onSelect}
    >
      <span className="flex size-7 shrink-0 items-center justify-center leading-none [&_svg]:block">
        <HugeiconsIcon
          className="size-7 text-[#1E1E1E] dark:text-white"
          icon={card.icon}
        />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-sans text-base leading-5 font-semibold text-[#1E1E1E] dark:text-white">
          {card.label}
        </span>
        <span className="font-sans text-sm leading-5 font-medium text-[#1E1E1EBF] dark:text-neutral-400">
          {card.description}
        </span>
      </span>
    </NavbarHref>
  );
}

function MobileRailItem({
  item,
  onSelect,
}: {
  item: MarketingNavRailItem;
  onSelect: () => void;
}) {
  return (
    <NavbarHref
      className={RAIL_CLASSNAME}
      external={item.external}
      href={item.href}
      onClick={onSelect}
    >
      <HugeiconsIcon
        className="size-5 shrink-0 text-[#1E1E1E99] dark:text-neutral-400"
        icon={item.icon}
      />
      <span className="font-sans text-sm leading-5 font-medium tracking-[-0.02em] text-[#1E1E1EA6] dark:text-neutral-400">
        {item.label}
      </span>
    </NavbarHref>
  );
}

function MobileAuthActions({
  isAuthenticated,
  isResolved,
  onNavigate,
  item,
}: NavbarAuthActionsProps & { onNavigate: () => void; item: Variants }) {
  if (!isResolved) {
    return null;
  }

  if (isAuthenticated) {
    return (
      <m.div variants={item}>
        <Link
          className={`cta-gradient-primary ${AUTH_BUTTON_CLASSNAME} font-medium text-white`}
          href={AUTH_DASHBOARD_URL}
          onClick={onNavigate}
        >
          Dashboard
        </Link>
      </m.div>
    );
  }

  return (
    <>
      <m.div variants={item}>
        <Link
          className={`${AUTH_BUTTON_CLASSNAME} border border-[#1E1E1E26] text-[#1E1E1E] dark:border-white/15 dark:text-white`}
          href={AUTH_SIGNIN_URL}
          onClick={onNavigate}
        >
          Sign In
        </Link>
      </m.div>
      <m.div variants={item}>
        <TrackedSignupLink
          className={`cta-gradient-primary ${AUTH_BUTTON_CLASSNAME} font-medium text-white`}
          onClick={onNavigate}
          source={NAVBAR_MOBILE_SIGNUP_SOURCE}
        >
          Sign Up
        </TrackedSignupLink>
      </m.div>
    </>
  );
}
