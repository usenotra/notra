export interface DashboardHomePageClientProps {
  greetingText: string;
  organizationSlug: string;
}

export interface StudioFreeHomeProps {
  greetingText: string;
  slug: string;
}

export interface HomeFeedbackSectionProps {
  organizationId: string;
  slug: string;
  /** Empty state without the table preview, for pages with other sections. */
  compact?: boolean;
}
