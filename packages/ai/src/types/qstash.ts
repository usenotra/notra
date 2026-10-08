export interface CreateQstashRouteScheduleProps {
  path: string;
  cron: string;
  body: Record<string, unknown>;
  scheduleId?: string;
}

export interface PublishQstashRouteMessageProps {
  path: string;
  body: Record<string, unknown>;
  /** Earliest delivery; QStash holds the message until then. */
  notBefore: Date;
  deduplicationId: string;
}
