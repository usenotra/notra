import type { PRODUCT_TOUR_STEPS } from "@/constants/product-tour";

export type ProductTourStep = (typeof PRODUCT_TOUR_STEPS)[number];

export interface TourRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface TourCardPosition {
  top: number;
  left: number;
}
