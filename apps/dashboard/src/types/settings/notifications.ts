import type { IconSvgElement } from "@hugeicons/react";

export interface NotificationSettings {
  scheduledContentCreation: boolean;
  scheduledContentFailed: boolean;
  scheduledContentSkipped: boolean;
  dailySummary: boolean;
}

/**
 * The user's own marketing email state. `blockedByUnsubscribe` means they
 * unsubscribed from all marketing via an email footer, which only Notra
 * support can lift in Brew.
 */
export interface MarketingEmailsState {
  enabled: boolean;
  blockedByUnsubscribe: boolean;
}

export type NotificationToggleKey = keyof NotificationSettings;

export interface NotificationToggleConfig {
  /** Organization settings, plus the user's own marketing opt-in. */
  key: NotificationToggleKey | "marketingEmails";
  label: string;
  description: string;
  defaultValue: boolean;
  icon: IconSvgElement;
}

export type NotificationToggleDefinition = Omit<
  NotificationToggleConfig,
  "label" | "description" | "key"
> & { key: NotificationToggleKey };

export interface NotificationToggleGroup {
  id: "content" | "geo";
  toggles: NotificationToggleDefinition[];
}

export interface NotificationToggleRowProps {
  config: NotificationToggleConfig;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}
