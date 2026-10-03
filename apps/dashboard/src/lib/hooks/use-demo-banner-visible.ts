"use client";

import { isDemoModeClient } from "@notra/utils/demo-mode";
import { useQueryState } from "nuqs";

import { DEMO_BANNER_OFF, DEMO_BANNER_PARAM } from "@/constants/demo";
import { demoBannerParser } from "@/lib/demo/banner-param";

/** `?banner=on|off` wins over the remembered cookie choice. */
export function useDemoBannerVisible(hiddenByCookie: boolean): boolean {
  const [banner] = useQueryState(DEMO_BANNER_PARAM, demoBannerParser);
  if (!isDemoModeClient()) {
    return false;
  }
  return banner ? banner !== DEMO_BANNER_OFF : !hiddenByCookie;
}
