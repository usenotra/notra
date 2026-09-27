import {
  BREADCRUMB_SEGMENTS,
  GEO_BREADCRUMB_SEGMENTS,
} from "@/constants/dashboard-breadcrumbs";
import type {
  BreadcrumbSegment,
  GeoBreadcrumbSegment,
} from "@/types/dashboard/breadcrumbs";

export function isBreadcrumbSegment(value: string): value is BreadcrumbSegment {
  return BREADCRUMB_SEGMENTS.some((segment) => segment === value);
}

export function isGeoBreadcrumbSegment(
  value: string
): value is GeoBreadcrumbSegment {
  return GEO_BREADCRUMB_SEGMENTS.some((segment) => segment === value);
}

export function fallbackSegmentLabel(segment: string): string {
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
}
