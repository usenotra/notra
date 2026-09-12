"use client";

import { usePathname } from "next/navigation";
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";

import { MOBILE_NAV_INERT_SELECTOR } from "@/constants/navbar";

const DESKTOP_NAV_QUERY = "(min-width: 64rem)";

export function useMobileNavMenu(
  isOpen: boolean,
  setOpen: Dispatch<SetStateAction<boolean>>,
  triggerRef: RefObject<HTMLButtonElement | null>
) {
  const pathname = usePathname();
  const wasOpenRef = useRef(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    if (isOpen) {
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
    } else {
      html.style.overflow = "";
      body.style.overflow = "";
    }
    return () => {
      html.style.overflow = "";
      body.style.overflow = "";
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }
    const nodes = document.querySelectorAll(MOBILE_NAV_INERT_SELECTOR);
    for (const node of nodes) {
      node.setAttribute("inert", "");
    }
    return () => {
      for (const node of nodes) {
        node.removeAttribute("inert");
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      triggerRef.current?.focus();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, triggerRef]);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_NAV_QUERY);
    const onChange = () => {
      if (media.matches) {
        setOpen(false);
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [setOpen]);

  return function closeAfterPaint() {
    // Let the click commit before unmounting the overlay.
    requestAnimationFrame(() => setOpen(false));
  };
}
