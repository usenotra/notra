export type GeoRecapTone = "up" | "down" | "neutral";

export interface GeoRecapChange {
  id: string;
  detail: string;
  tone: GeoRecapTone;
}

export interface GeoRecapItem {
  id: string;
  title: string;
  changes: GeoRecapChange[];
  engineLabel?: string;
  engineIconSrc?: string;
}

export interface GeoRecapCompetitor {
  name: string;
  shareLabel: string;
  deltaLabel: string;
  isOwnBrand?: boolean;
}

export interface GeoRecapAction {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  label: string;
}

export interface WeeklySummaryEmailProps {
  organizationName: string;
  organizationSlug: string;
  weekLabel: string;
  headline: string;
  /** Nothing moved; the email only confirms visibility held. */
  quiet: boolean;
  visibilityLabel: string;
  visibilityDeltaLabel: string;
  answersChecked: number;
  items: GeoRecapItem[];
  remainingCount: number;
  competitors: GeoRecapCompetitor[];
  action?: GeoRecapAction;
  dashboardLink: string;
}

export interface VisibilityDropEmailProps {
  organizationName: string;
  organizationSlug: string;
  headline: string;
  previousLabel: string;
  currentLabel: string;
  deltaLabel: string;
  items: GeoRecapItem[];
  remainingCount: number;
  dashboardLink: string;
}
