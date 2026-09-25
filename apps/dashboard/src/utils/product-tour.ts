import {
  PRODUCT_TOUR_CARD_HEIGHT,
  PRODUCT_TOUR_CARD_WIDTH,
  PRODUCT_TOUR_TARGET_GAP,
  PRODUCT_TOUR_VIEWPORT_MARGIN,
} from "@/constants/product-tour";
import { localStorageKeys } from "@/constants/storage";
import type { TourCardPosition, TourRect } from "@/types/components/product-tour";

const PRODUCT_TOUR_EVENT = "notra:product-tour";
const PENDING = "pending";

export function armProductTour(slug: string): void {
  writeProductTour(slug, PENDING);
}

export function finishProductTour(slug: string): void {
  writeProductTour(slug, "done");
}

export function isProductTourPending(slug: string): boolean {
  try {
    return localStorage.getItem(localStorageKeys.productTour(slug)) === PENDING;
  } catch {
    return false;
  }
}

export function subscribeToProductTour(onChange: () => void): () => void {
  window.addEventListener(PRODUCT_TOUR_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(PRODUCT_TOUR_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function tourCardPosition(
  target: TourRect | null,
  viewport: { width: number; height: number }
): TourCardPosition {
  const margin = PRODUCT_TOUR_VIEWPORT_MARGIN;
  const card = {
    width: Math.min(PRODUCT_TOUR_CARD_WIDTH, viewport.width - margin * 2),
    height: PRODUCT_TOUR_CARD_HEIGHT,
  };
  if (!target) {
    return {
      top: Math.max(margin, viewport.height - card.height - margin),
      left: Math.max(margin, (viewport.width - card.width) / 2),
    };
  }

  let top = target.top + target.height + PRODUCT_TOUR_TARGET_GAP;
  if (top + card.height > viewport.height - margin) {
    top = target.top - card.height - PRODUCT_TOUR_TARGET_GAP;
  }
  top = Math.min(
    Math.max(margin, top),
    Math.max(margin, viewport.height - card.height - margin)
  );
  const left = Math.min(
    Math.max(margin, target.left),
    Math.max(margin, viewport.width - card.width - margin)
  );
  return { top, left };
}

export function findTourTarget(
  id: string,
  navLink: string
): HTMLElement | null {
  const page = document.querySelector(`[data-product-tour="${id}"]`);
  if (isVisibleElement(page)) {
    return page;
  }
  const nav = document.querySelector(`[data-product-tour="nav:${navLink}"]`);
  if (isVisibleElement(nav)) {
    return nav;
  }
  return null;
}

function isVisibleElement(node: Element | null): node is HTMLElement {
  return node instanceof HTMLElement && node.getClientRects().length > 0;
}

function writeProductTour(slug: string, value: string): void {
  try {
    localStorage.setItem(localStorageKeys.productTour(slug), value);
  } catch {
    // Private browsing can block storage. The tour stays off.
  }
  window.dispatchEvent(new Event(PRODUCT_TOUR_EVENT));
}
