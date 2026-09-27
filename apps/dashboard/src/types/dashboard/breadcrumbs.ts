import type { GeoTab } from "@notra/geo-core/types/geo";

import type {
  BREADCRUMB_SEGMENTS,
  GEO_BREADCRUMB_SEGMENTS,
} from "@/constants/dashboard-breadcrumbs";

export type BreadcrumbSegment = (typeof BREADCRUMB_SEGMENTS)[number];

export type GeoBreadcrumbSegment = (typeof GEO_BREADCRUMB_SEGMENTS)[number];

export interface BreadcrumbLabels {
  geo: string;
  segments: Record<BreadcrumbSegment, string>;
  geoSegments: Record<GeoBreadcrumbSegment, string>;
  geoTabs: Record<GeoTab, string>;
}
