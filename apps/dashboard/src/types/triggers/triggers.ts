import type {
  LookbackWindow,
  OutputContentType,
  WebhookEventType,
} from "@notra/schemas/dashboard/integrations";

export type TriggerSourceType =
  | "github_webhook"
  | "linear_webhook"
  | "cron"
  | "manual";

export interface TriggerTarget {
  repositoryIds: string[];
}

export interface TriggerSourceConfig {
  eventTypes?: WebhookEventType[];
  includePreReleases?: boolean;
  cron?: {
    frequency: "daily" | "weekly" | "monthly" | "custom";
    hour: number;
    minute: number;
    dayOfWeek?: number;
    dayOfMonth?: number;
    intervalDays?: number;
    anchorDate?: string;
  };
}

export interface TriggerOutputConfig {
  publishDestination?: "webflow" | "framer" | "custom";
  brandVoiceId?: string;
  instructions?: string;
}

export interface Trigger {
  id: string;
  organizationId: string;
  name: string;
  sourceType: TriggerSourceType;
  sourceConfig: TriggerSourceConfig;
  targets: TriggerTarget;
  outputType: OutputContentType;
  outputConfig?: TriggerOutputConfig | null;
  lookbackWindow?: LookbackWindow;
  enabled: boolean;
  autoPublish: boolean;
  createdAt: string;
  updatedAt: string;
}
