export interface ScheduledPublicationFailedEmailProps {
  organizationName: string;
  organizationSlug: string;
  postTitle: string;
  destinationLabel: string;
  scheduledFor: string;
  reason: string;
  postLink: string;
}
