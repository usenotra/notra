"use client";

import { GEO_DEFAULT_TAB } from "@notra/geo-core/constants/geo";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect } from "react";

import { toGeoTab } from "@/utils/geo-tabs";

export function useGeoTab() {
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsString.withDefault(GEO_DEFAULT_TAB)
  );
  useEffect(() => {
    if (tab === "sentiment") {
      void setTab("brand-sentiment", { history: "replace" });
    }
  }, [tab, setTab]);
  return { activeTab: toGeoTab(tab), setActiveTab: setTab };
}
